@echo off 
echo Extracting files... 
powershell -Command "& {Expand-Archive -Path '%~dp0MultiLLMCompare.zip' -DestinationPath '%USERPROFILE%\MultiLLMCompare' -Force}" 
echo Creating desktop shortcut... 
powershell -Command "& {$WshShell = New-Object -ComObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%USERPROFILE%\Desktop\MultiLLMCompare.lnk'); $Shortcut.TargetPath = '%USERPROFILE%\MultiLLMCompare\start-app.bat'; $Shortcut.IconLocation = '%USERPROFILE%\MultiLLMCompare\icon.ico'; $Shortcut.Save()}" 
echo Installation complete! 
echo Do you want to install Electron runtime now? (Y/N) 
set /p choice= 
if /i "%choice%"=="Y" start "" "%USERPROFILE%\MultiLLMCompare\install-electron.bat" 
echo Do you want to start the application now? (Y/N) 
set /p choice= 
if /i "%choice%"=="Y" start "" "%USERPROFILE%\MultiLLMCompare\start-app.bat" 
pause 
