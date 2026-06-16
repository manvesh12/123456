const fs = require('fs');

const cssRules = `
/* ENHANCED MODAL STYLES FOR BLUR AND CENTERING */
.modal-overlay {
    position: fixed !important; 
    top: 0 !important; 
    left: 0 !important; 
    right: 0 !important; 
    bottom: 0 !important;
    background: rgba(10,25,47,0.7) !important;
    backdrop-filter: blur(8px) !important;
    -webkit-backdrop-filter: blur(8px) !important;
    z-index: 99999 !important; 
    align-items: center !important; 
    justify-content: center !important;
    padding: 20px !important; 
    overflow-y: auto !important;
}
.modal-box {
    margin: auto !important;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5) !important;
    border: 1px solid rgba(255,255,255,0.1) !important;
    pointer-events: auto !important;
}
`;

fs.appendFileSync('./apps/web/public/legacy/css/styles.css', cssRules);
console.log("Enhanced modal CSS appended successfully!");
