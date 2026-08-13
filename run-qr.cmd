@echo off
cd /d "C:\Users\Admin\Documents\Default Project\FacelessStudio"
"C:\Program Files\nodejs\node.exe" "src\__qr-clean.mjs" > "out\login.log" 2> "out\login.err.log"