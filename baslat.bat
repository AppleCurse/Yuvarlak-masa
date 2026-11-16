@echo off
chcp 65001 >nul
set PYTHONIOENCODING=utf-8
set PYTHONUTF8=1
title KONSUL AI - Coklu Model Konsey ve Muhakeme Istasyonu
echo ========================================================
echo   KONSUL AI - YUVARLAK MASA VE MUHAKEME ISTASYONU
echo ========================================================
echo.
echo   Sunucu Baslatiliyor: http://127.0.0.1:8888
echo   Tarayiciniz otomatik olarak acilacaktir.
echo   Durdurmak icin bu pencereyi kapatabilir veya Ctrl+C yapabilirsiniz.
echo.
python app.py
pause
