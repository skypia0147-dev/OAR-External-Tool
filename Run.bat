@echo off
dotnet build -c Release
start "" "bin\Release\net9.0-windows\OAR External Tool.exe"
exit
