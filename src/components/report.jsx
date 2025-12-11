import React from 'react';

// --- Icons ---
const IconRefresh = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const IconHome = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);

const Report = ({ finalAcuity, history, onRestart, onClose }) => {
  const getDecimalAcuity = (acuity) => {
    if (!acuity) return 0;
    const parts = acuity.split('/');
    if (parts.length !== 2) return 0;
    return (parseFloat(parts[0]) / parseFloat(parts[1])).toFixed(2);
  };

  const getInterpretation = (acuity) => {
    if (!acuity) return { text: "Unknown", color: "text-gray-400" };
    const val = parseFloat(acuity.split('/')[1]);
    if (val <= 6) return { text: "Normal Vision or Better", color: "text-green-400" };
    if (val <= 12) return { text: "Mild Vision Loss", color: "text-yellow-400" };
    if (val <= 24) return { text: "Moderate Vision Loss", color: "text-orange-400" };
    return { text: "Significant Vision Loss", color: "text-red-400" };
  };

  const interpretation = getInterpretation(finalAcuity);
  const decimalScore = getDecimalAcuity(finalAcuity);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-8 animate-fade-in bg-gray-900 overflow-y-auto">
      <div className="bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden">
        
        {/* Header */}
        <div className="bg-gray-900 p-6 border-b border-gray-700 text-center">
          <h2 className="text-3xl font-bold text-white mb-1">Test Results</h2>
          <p className="text-gray-400 text-sm">Landolt C Visual Acuity Test</p>
        </div>

        {/* Main Score */}
        <div className="p-8 text-center bg-gray-800">
          <div className="mb-2 text-gray-400 uppercase tracking-widest text-xs font-semibold">Final Acuity</div>
          <div className="text-6xl font-extrabold text-white mb-2">{finalAcuity}</div>
          <div className={`text-xl font-medium ${interpretation.color}`}>
            {interpretation.text}
          </div>
          <div className="mt-4 inline-block bg-gray-700 rounded-lg px-4 py-2 text-sm text-gray-300">
            Decimal: <span className="text-white font-bold">{decimalScore}</span>
          </div>
        </div>

        {/* History Table */}
        <div className="px-8 pb-8">
          <h3 className="text-lg font-semibold text-white mb-4 border-b border-gray-700 pb-2">Attempt History</h3>
          <div className="max-h-48 overflow-y-auto pr-2 custom-scrollbar">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-400 uppercase bg-gray-700 sticky top-0">
                <tr>
                  <th className="px-4 py-2 rounded-tl-lg">Level</th>
                  <th className="px-4 py-2 rounded-tr-lg text-right">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {history.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-750 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-200">{item.acuity}</td>
                    <td className="px-4 py-3 text-right">
                      {item.couldSee ? (
                        <span className="bg-green-900 text-green-300 py-1 px-2 rounded text-xs">Passed</span>
                      ) : (
                        <span className="bg-red-900 text-red-300 py-1 px-2 rounded text-xs">Failed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer / Actions */}
        <div className="bg-gray-900 p-6 flex justify-between gap-4 border-t border-gray-700">
          <button 
            onClick={onClose}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white transition-all font-semibold"
          >
            <IconHome className="w-5 h-5" />
            Home
          </button>
          <button 
            onClick={onRestart}
            className="flex-[2] flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-blue-500/20 transition-all font-bold"
          >
            <IconRefresh className="w-5 h-5" />
            Retake Test
          </button>
        </div>
      </div>
      
      <p className="mt-6 text-xs text-gray-500 max-w-md text-center">
        Disclaimer: This test is for screening purposes only and does not replace a professional eye examination.
      </p>
    </div>
  );
};

export default Report;