
const fs = require('fs');

function processFile(path) {
    if (!fs.existsSync(path)) return;
    let text = fs.readFileSync(path, 'utf8');

    // Colors
    text = text.replace(/bg-\[\#0B0F19\]/g, 'bg-[#F8FAFC]');
    text = text.replace(/bg-\[\#0D1117\]/g, 'bg-white');
    text = text.replace(/bg-\[\#0D1117\]\/\[0\.02\]/g, 'bg-slate-50 border-slate-100');
    text = text.replace(/bg-\[\#0D1117\]\/\[0\.04\]/g, 'bg-slate-100');
    text = text.replace(/bg-\[\#0D1117\]\/\[0\.08\]/g, 'bg-slate-200');

    text = text.replace(/text-white\/10/g, 'text-slate-300');
    text = text.replace(/text-white\/20/g, 'text-slate-500');
    text = text.replace(/text-white\/25/g, 'text-slate-500');
    text = text.replace(/text-white\/30/g, 'text-slate-500');
    text = text.replace(/text-white\/40/g, 'text-slate-600');
    text = text.replace(/text-white\/50/g, 'text-slate-600');
    text = text.replace(/text-white\/60/g, 'text-slate-600');
    text = text.replace(/text-white\/70/g, 'text-slate-700');
    text = text.replace(/text-white\/80/g, 'text-slate-800');
    text = text.replace(/text-white\/85/g, 'text-slate-800');
    text = text.replace(/ text-white /g, ' text-slate-800 ');
    text = text.replace(/text-white\b/g, 'text-slate-800');
    text = text.replace(/text-white/g, 'text-slate-800');

    // Borders
    text = text.replace(/border-white\/\[0\.02\]/g, 'border-slate-100');
    text = text.replace(/border-white\/\[0\.03\]/g, 'border-slate-100');
    text = text.replace(/border-white\/\[0\.04\]/g, 'border-slate-100');
    text = text.replace(/border-white\/\[0\.05\]/g, 'border-slate-200');
    text = text.replace(/border-white\/\[0\.06\]/g, 'border-slate-200');
    text = text.replace(/border-white\/\[0\.08\]/g, 'border-slate-200');
    text = text.replace(/border-white\/\[0\.1\]/g, 'border-slate-300');
    
    // Transparent UI
    text = text.replace(/bg-white\/\[0\.01\]/g, 'bg-slate-50');
    text = text.replace(/bg-white\/\[0\.02\]/g, 'bg-slate-50');
    text = text.replace(/bg-white\/\[0\.03\]/g, 'bg-slate-100');
    text = text.replace(/bg-white\/\[0\.04\]/g, 'bg-slate-100');
    text = text.replace(/bg-white\/\[0\.05\]/g, 'bg-slate-200');

    text = text.replace(/hover:bg-white\/\[0\.02\]/g, 'hover:bg-slate-100');
    text = text.replace(/hover:bg-white\/\[0\.03\]/g, 'hover:bg-slate-100');
    text = text.replace(/hover:bg-white\/\[0\.04\]/g, 'hover:bg-slate-100');
    text = text.replace(/hover:bg-white\/\[0\.05\]/g, 'hover:bg-slate-200');
    text = text.replace(/hover:text-white\/50/g, 'hover:text-slate-700');

    text = text.replace(/shadow-\[0_8px_30px_rgba\(0,0,0,0\.4\)\]/g, 'shadow-xl shadow-slate-200 border-none');
    text = text.replace(/from-emerald-900\/10 via-\[\#0B0F19\] to-\[\#0B0F19\]/g, 'from-emerald-50 via-transparent to-transparent');
    text = text.replace(/from-amber-600\/\[0\.04\] via-transparent to-transparent/g, 'from-amber-100 via-transparent to-transparent');
    text = text.replace(/from-blue-900\/20 via-\[\#0B0F19\] to-\[\#0B0F19\]/g, 'from-blue-50 via-transparent to-transparent');
    
    fs.writeFileSync(path, text, 'utf8');
}

processFile('src/site-engg/components/MusterRoll.tsx');
processFile('src/site-engg/components/CompanyProfile.tsx');
processFile('src/site-engg/components/DataManagement.tsx');
processFile('src/site-engg/components/ProfileEditor.tsx');
processFile('src/site-engg/components/ProfileViewer.tsx');
processFile('src/site-engg/components/dashboards/HRClientWiseView.tsx');

