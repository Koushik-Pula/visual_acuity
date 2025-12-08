import base64
import cv2
import numpy as np
import os
import logging
import json
import re
import difflib  # Added for fuzzy matching
from datetime import datetime, timedelta
from fastapi import FastAPI, WebSocket, HTTPException, status, Depends, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer
import asyncio
from collections import deque
from dotenv import load_dotenv
# Vosk import removed as requested
import time

# --- All your auth, models, and db imports are preserved ---
from auth import (
    authenticate_user, 
    create_access_token, 
    get_password_hash, 
    get_current_active_user,
    verify_websocket_token,
    ACCESS_TOKEN_EXPIRE_MINUTES
)
from models import UserCreate, UserLogin, Token, User, UserInDB, UserUpdate, CalibrationData
from database import users_collection, close_database_connection
# ---

load_dotenv()

# Set logging to DEBUG to see all messages
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Face Detection API with Authentication")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer()

# --- Face Detection & Calibration (Preserved) ---
MODEL_PATH = "face_detection_yunet_2023mar.onnx"
face_detector = None
try:
    if os.path.exists(MODEL_PATH):
        face_detector = cv2.FaceDetectorYN.create(
            MODEL_PATH, "", (320, 320), score_threshold=0.4, nms_threshold=0.3, top_k=5000
        )
    else:
        logger.error(f"Model file '{MODEL_PATH}' not found!")
        # raise FileNotFoundError(f"Model file '{MODEL_PATH}' not found!") 
        # Kept non-blocking for now per your original structure, but logged error.
except Exception as e:
    logger.error(f"Failed to load Face Detector: {e}")

KNOWN_FACE_WIDTH = 0.15  
FOCAL_LENGTH = None  
TARGET_DISTANCE = 4.0  
DISTANCE_THRESHOLD = 0.2  

calibration_active = False
distance_measurement_active = False
previous_distances = deque(maxlen=5)

# (Vosk init_voice_model removed as it's no longer needed)

def calculate_distance(face_width):
    return round((KNOWN_FACE_WIDTH * FOCAL_LENGTH) / face_width, 2) if FOCAL_LENGTH and face_width > 0 else -1

def calculate_expected_face_width_at_distance(distance):
    return int((KNOWN_FACE_WIDTH * FOCAL_LENGTH) / distance) if FOCAL_LENGTH else 0

def calibrate_focal_length(face_width, known_distance=0.7):
    global FOCAL_LENGTH
    FOCAL_LENGTH = (face_width * known_distance) / KNOWN_FACE_WIDTH
    logger.info(f"Focal length calibrated: {FOCAL_LENGTH}")
    return FOCAL_LENGTH

def smooth_distance(new_distance):
    if new_distance <= 0: return new_distance
    previous_distances.append(new_distance)
    if len(previous_distances) >= 3:
        sorted_distances = sorted(previous_distances)
        return sorted_distances[len(sorted_distances) // 2]
    return new_distance

def is_at_target_distance(distance):
    return abs(distance - TARGET_DISTANCE) <= DISTANCE_THRESHOLD

def create_processed_image(frame, faces, distance=-1, quality=70):
    output_frame = frame.copy()
    height, width = output_frame.shape[:2]
    center_x, center_y = width // 2, height // 2
    
    if distance_measurement_active and FOCAL_LENGTH:
        expected_face_width = calculate_expected_face_width_at_distance(TARGET_DISTANCE)
        if expected_face_width > 0:
            expected_face_height = int(expected_face_width * 1.5)
            ref_x = center_x - expected_face_width // 2
            ref_y = center_y - expected_face_height // 2
            box_color = (0, 255, 0) if is_at_target_distance(distance) else (0, 0, 255)
            box_thickness = 3 if is_at_target_distance(distance) else 2
            cv2.rectangle(output_frame, (ref_x, ref_y), (ref_x + expected_face_width, ref_y + expected_face_height), box_color, box_thickness)  
            if is_at_target_distance(distance):
                cv2.putText(output_frame, "PERFECT! 4m REACHED", (ref_x, ref_y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.6, box_color, 2)
            else:
                cv2.putText(output_frame, "4m Reference", (ref_x, ref_y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, box_color, 1)
    
    if faces is not None:
        for face in faces:
            x, y, w, h, confidence = map(float, face[:5])
            x, y, w, h = int(x), int(y), int(w), int(h)
            cv2.rectangle(output_frame, (x, y), (x + w, y + h), (0, 255, 0), 2)
            text = f"{confidence:.2f}"
            cv2.putText(output_frame, text, (x, y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 1)
            if distance_measurement_active and FOCAL_LENGTH:
                distance = calculate_distance(w)
                if distance > 0:
                    color = (0, 255, 0) if is_at_target_distance(distance) else (255, 0, 0)
                    thickness = 2 if is_at_target_distance(distance) else 1
                    distance_text = f"{distance}m"
                    if is_at_target_distance(distance):
                        distance_text = f"{distance}m"
                    cv2.putText(output_frame, distance_text, (x, y + h + 20), cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, thickness)
    
    encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), quality]
    _, buffer = cv2.imencode('.jpg', output_frame, encode_param)
    img_str = base64.b64encode(buffer).decode('utf-8')
    return f"data:image/jpeg;base64,{img_str}"

async def process_image(image_data):
    global calibration_active, distance_measurement_active
    if face_detector is None:
        return {"error": "Face detector not initialized"}

    try:
        img_bytes = base64.b64decode(image_data.split(',')[-1])
        img_np = np.frombuffer(img_bytes, np.uint8)
        frame = cv2.imdecode(img_np, cv2.IMREAD_COLOR)
        if frame is None: return {"error": "Invalid image"}

        height, width = frame.shape[:2]
        if width > 640:
            scale = 640 / width
            frame = cv2.resize(frame, (640, int(height * scale)))

        h, w = frame.shape[:2]
        face_detector.setInputSize((w, h))
        results = face_detector.detect(frame)
        faces = results[1] if results is not None and len(results) > 1 else None

        reference_box = None
        if FOCAL_LENGTH:
            expected_width = calculate_expected_face_width_at_distance(TARGET_DISTANCE)
            if expected_width > 0:
                reference_box = {"width": expected_width, "height": int(expected_width * 1.5)}

        if faces is None or len(faces) == 0:
            return {
                "success": False, "message": "No face detected",
                "reference_box": reference_box if distance_measurement_active else None,
                "processed_image": create_processed_image(frame, None, quality=60),
                "face_detected": False
            }

        face = max(faces, key=lambda x: x[2] * x[3])  
        x, y, fw, fh, confidence = map(float, face[:5])

        if confidence >= 0.4:
            if calibration_active:
                focal = calibrate_focal_length(fw)
                calibration_active = False
                return {
                    "success": True, "message": "Calibration complete", "focal_length": focal,
                    "processed_image": create_processed_image(frame, faces, quality=60), "face_detected": True
                }

            if distance_measurement_active and FOCAL_LENGTH:
                raw_distance = calculate_distance(fw)
                smoothed_distance = smooth_distance(raw_distance)
                at_target = is_at_target_distance(smoothed_distance)
                return {
                    "success": True,
                    "faces": [{"x": int(x), "y": int(y), "width": int(fw), "height": int(fh), "confidence": round(confidence, 2), "distance": smoothed_distance}],
                    "focal_length": FOCAL_LENGTH, "reference_box": reference_box,
                    "processed_image": create_processed_image(frame, faces, smoothed_distance, quality=60),
                    "face_detected": True, "at_target_distance": at_target
                }
            
            return {
                "success": True, "message": "Face detected, but distance mode is off.",
                "processed_image": create_processed_image(frame, faces, quality=60), "face_detected": True
            }

        return {
            "success": False, "message": "Face detected but confidence too low",
            "processed_image": create_processed_image(frame, None, quality=60), "face_detected": False
        }
    except Exception as e:
        logger.error(f"Error in processing: {e}")
        return {"error": str(e)}

# --- Auth Endpoints (Preserved) ---
@app.post("/auth/register", response_model=Token)
async def register(user: UserCreate):
    existing_user = await users_collection.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
    
    hashed_password = get_password_hash(user.password)
    user_dict = user.dict()
    del user_dict['password']
    user_dict['hashed_password'] = hashed_password
    user_dict['is_active'] = True
    user_dict['created_at'] = datetime.utcnow()
    user_dict['updated_at'] = datetime.utcnow()
    
    user_in_db = UserInDB(**user_dict)
    await users_collection.insert_one(user_in_db.dict(by_alias=True, exclude={"id"}))
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(data={"sub": user.email}, expires_delta=access_token_expires)
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/auth/login", response_model=Token)
async def login(user_credentials: UserLogin):
    user = await authenticate_user(user_credentials.email, user_credentials.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password", headers={"WWW-Authenticate": "Bearer"})
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(data={"sub": user.email}, expires_delta=access_token_expires)
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/auth/me", response_model=User)
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    return current_user

@app.put("/auth/update-calibration", response_model=User)
async def update_calibration(calibration_data: CalibrationData, current_user: User = Depends(get_current_active_user)):
    update_data = calibration_data.dict(exclude_unset=True)
    update_data['updated_at'] = datetime.utcnow()
    await users_collection.update_one({"email": current_user.email}, {"$set": update_data})
    updated_user = await users_collection.find_one({"email": current_user.email})
    return User(**updated_user)

@app.get("/auth/calibration", response_model=CalibrationData)
async def get_calibration(current_user: User = Depends(get_current_active_user)):
    return CalibrationData(
        focal_length=current_user.focal_length,
        pixels_per_mm=current_user.pixels_per_mm,
        screen_ppi=current_user.screen_ppi
    )

@app.get("/auth/protected")
async def protected_route(current_user: User = Depends(get_current_active_user)):
    return {"message": f"Hello {current_user.full_name}, this is a protected route!"}

# --- Calibration WebSocket (Preserved) ---
@app.websocket("/ws/calibration")
async def calibration_websocket(websocket: WebSocket):
    global calibration_active, distance_measurement_active
    await websocket.accept()
    rate_limit = 0.05  
    last_process_time = 0
    try:
        await websocket.send_json({"message": "Connected to calibration service"})
        while True:
            data = await websocket.receive_json()
            if "command" in data:
                cmd = data["command"]
                if cmd == "start_calibration":
                    calibration_active = True
                    distance_measurement_active = False
                    await websocket.send_json({"message": "Please stand at one-arm distance and click Capture"})
                elif cmd == "capture" and "image" in data:
                    response = await process_image(data["image"])
                    await websocket.send_json(response)
                continue
            if "image" in data:
                current_time = asyncio.get_event_loop().time()
                if current_time - last_process_time < rate_limit:
                    continue
                last_process_time = current_time
                response = await process_image(data["image"])
                await websocket.send_json(response)
    except WebSocketDisconnect:
        logger.info("Calibration WebSocket disconnected")
    except Exception as e:
        logger.error(f"Calibration WebSocket error: {e}")

# --- Face Detection WebSocket (Preserved) ---
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    global calibration_active, distance_measurement_active, FOCAL_LENGTH
    await websocket.accept()
    try:
        auth_data = await websocket.receive_json()
        if "token" not in auth_data:
            await websocket.send_json({"error": "Authentication token required"})
            await websocket.close(code=1008)
            return
        user = await verify_websocket_token(auth_data["token"])
        if not user:
            await websocket.send_json({"error": "Invalid authentication token"})
            await websocket.close(code=1008)
            return
        await websocket.send_json({"message": f"Authenticated successfully as {user.full_name}"})
    except Exception as e:
        logger.error(f"Authentication error: {e}")
        await websocket.close(code=1008)
        return
    
    rate_limit = 0.05  
    last_process_time = 0
    
    while True:
        try:
            data = await websocket.receive_json()
            if "command" in data:
                cmd = data["command"]
                if cmd == "start_calibration":
                    calibration_active = True
                    distance_measurement_active = False
                    await websocket.send_json({"message": "Please stand at one-arm distance and click Capture"})
                elif cmd == "start_distance":
                    if "focal_length" in data:
                        FOCAL_LENGTH = data["focal_length"]
                        logger.info(f"Using user's focal length: {FOCAL_LENGTH}")
                        await websocket.send_json({"message": f"Distance measurement started with focal length: {FOCAL_LENGTH}"})
                    else:
                        await websocket.send_json({"error": "No focal length provided. Please calibrate first."})
                        continue
                    distance_measurement_active = True
                    calibration_active = False
                elif cmd == "stop_all":
                    calibration_active = False
                    distance_measurement_active = False
                    await websocket.send_json({"message": "Measurement stopped"})
                elif cmd == "capture" and "image" in data:
                    response = await process_image(data["image"])
                    await websocket.send_json(response)
                continue
            if "image" in data:
                current_time = asyncio.get_event_loop().time()
                if current_time - last_process_time < rate_limit:
                    continue
                last_process_time = current_time
                response = await process_image(data["image"])
                await websocket.send_json(response)
        except WebSocketDisconnect:
            logger.info("WebSocket disconnected")
            break
        except Exception as e:
            logger.error(f"WebSocket error: {e}")
            break

# --- Landolt C Screen PPI Endpoint (Preserved) ---
@app.get("/api/get-screen-ppi")
async def get_screen_ppi(current_user: User = Depends(get_current_active_user)):
    try:
        user_data = await users_collection.find_one({"email": current_user.email})
        if user_data and user_data.get('screen_ppi'):
            return {"screen_ppi": user_data['screen_ppi']}
        else:
            return {"screen_ppi": 96.0}
    except Exception as e:
        logger.error(f"Error fetching screen PPI: {e}")
        return {"screen_ppi": 96.0}

# --- UPDATED: Text-Based Voice Logic (REPLACED Vosk logic) ---
def process_voice_command(text: str):
    if not text:
        return None
        
    # 1. Clean the text: Lowercase + Remove punctuation (dots, question marks)
    # This fixes issues where browser sends "Up." or "Right?"
    text = text.lower().strip()
    text = re.sub(r'[^\w\s]', '', text) 
    
    logger.info(f"[VOICE] Processing cleaned text: '{text}'")
    
    # 2. Exact phrase mapping
    phrase_map = {
        "to the left": "left",
        "to the right": "right",
        "upward": "up",
        "upwards": "up",
        "go up": "up",
        "downward": "down",
        "downwards": "down",
        "go down": "down",
        "stop": "pause",     
        "wait": "pause",
        "hold on": "pause"
    }
    if text in phrase_map:
        return phrase_map[text]
    
    # 3. Keyword Search (Token based)
    directions = {
        "up": {"up", "above", "top", "app", "up."}, # Added common misinterpretations
        "down": {"down", "below", "bottom", "done"},
        "left": {"left", "lift", "light"}, # 'light' sometimes heard for 'left'
        "right": {"right", "write", "white", "alright", "rite"},
        "pause": {"pause", "stop", "wait", "halt"}
    }
    
    words = set(text.split())
    
    # Exact/partial set match
    for dir_name, patterns in directions.items():
        if words.intersection(patterns):
            return dir_name
            
    # Fuzzy fallback
    for word in words:
        for dir_name, patterns in directions.items():
            for pattern in patterns:
                # Use strict threshold (0.85) to avoid false positives
                similarity = difflib.SequenceMatcher(None, word, pattern).ratio()
                if similarity > 0.85:
                    logger.info(f"[VOICE] Fuzzy match: '{word}' -> '{dir_name}'")
                    return dir_name
    
    return None

# --- UPDATED: Voice WebSocket (Handles Text Only) ---
@app.websocket("/ws_voice")
async def websocket_voice(websocket: WebSocket):
    await websocket.accept()
    logger.info("[VOICE] WebSocket accepted")
    
    current_symbol = None 
    
    try:
        token = websocket.query_params.get("token")
        if not token:
            await websocket.close(1008, "Authentication required")
            return
        
        user = await verify_websocket_token(token)
        if not user:
            await websocket.close(1008, "Invalid token")
            return
        
        await websocket.send_json({"status": "authenticated", "user": user.full_name})

        while True:
            try:
                # We expect text JSON from Web Speech API now, not bytes
                message = await websocket.receive_text()
                data = json.loads(message)
            except json.JSONDecodeError:
                continue
            except WebSocketDisconnect:
                logger.info("[VOICE] Client disconnected gracefully")
                break
            
            command = data.get("command")
            
            if command == "prepare_voice_model":
                 # Dummy response to keep frontend state machine happy
                 await websocket.send_json({"status": "ready_for_test"})

            elif command == "START_SYMBOL" or command == "NEXT_SYMBOL":
                # Ensure we strip whitespace/case from the game state too
                raw_orientation = data.get("orientation", "")
                current_symbol = raw_orientation.lower().strip()
                logger.info(f"[VOICE] Game Expecting: '{current_symbol}'")
            
            elif command == "STOP_LISTENING":
                current_symbol = None
            
            # Input from Web Speech API
            elif command == "VOICE_INPUT":
                raw_text = data.get("text", "")
                processed_cmd = process_voice_command(raw_text)
                
                if processed_cmd:
                    logger.info(f"[VOICE] Matched Command: '{processed_cmd}' vs Expected: '{current_symbol}'")
                    
                    if processed_cmd == "pause":
                        await websocket.send_json({"status": "PAUSE_REQUESTED"})
                        continue

                    if current_symbol:
                        is_correct = (processed_cmd == current_symbol)
                        
                        await websocket.send_json({
                            "status": "CORRECT" if is_correct else "INCORRECT",
                            "text": raw_text
                        })
                        
                        # Only clear if correct? No, clear to prevent double processing of same word
                        if is_correct:
                            current_symbol = None 
                else:
                    logger.info(f"[VOICE] Unrecognized: '{raw_text}'")
                    await websocket.send_json({"status": "UNRECOGNIZED", "text": raw_text})

    except WebSocketDisconnect:
        logger.info("[VOICE] Disconnected")
    except Exception as e:
        logger.error(f"[VOICE] Unexpected error: {e}", exc_info=True)


@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.on_event("startup")
async def startup_event():
    logger.info("Face Detection API with Authentication started")
    # init_voice_model() - Removed

@app.on_event("shutdown")
async def shutdown_event():
    await close_database_connection()
    logger.info("Face Detection API shut down")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)