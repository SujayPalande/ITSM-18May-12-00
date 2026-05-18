
const fs = require('fs');

function processFile(path) {
    if (!fs.existsSync(path)) return;
    let text = fs.readFileSync(path, 'utf8');

    // Colors
    text = text.replace(/bg-\[\#0B0F19\]\/95/g, 'bg-white/95');
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
    text = text.replace(/text-white\/90/g, 'text-slate-900');
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
    text = text.replace(/ring-white\/\[0\.06\]/g, 'ring-slate-200');
    
    // Transparent UI
    text = text.replace(/bg-white\/\[0\.01\]/g, 'bg-slate-50');
    text = text.replace(/bg-white\/\[0\.02\]/g, 'bg-slate-50');
    text = text.replace(/bg-white\/\[0\.03\]/g, 'bg-slate-100');
    text = text.replace(/bg-white\/\[0\.04\]/g, 'bg-slate-100');
    text = text.replace(/bg-white\/\[0\.05\]/g, 'bg-slate-200');
    text = text.replace(/bg-white\/\[0\.06\]/g, 'bg-slate-200');

    text = text.replace(/hover:bg-white\/\[0\.02\]/g, 'hover:bg-slate-100');
    text = text.replace(/hover:bg-white\/\[0\.03\]/g, 'hover:bg-slate-100');
    text = text.replace(/hover:bg-white\/\[0\.04\]/g, 'hover:bg-slate-100');
    text = text.replace(/hover:bg-white\/\[0\.05\]/g, 'hover:bg-slate-200');
    text = text.replace(/hover:text-white\/50/g, 'hover:text-slate-700');
    text = text.replace(/hover:text-white\/80/g, 'hover:text-slate-900');

    fs.writeFileSync(path, text, 'utf8');
}

processFile('src/site-engg/components/Header.tsx');
processFile('src/site-engg/components/mobile/MobileHeader.tsx');

