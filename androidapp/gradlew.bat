@echo off
set DIR=%~dp0
set CLASSPATH=%DIR%gradle\wrapper\gradle-wrapper.jar

if not exist "%CLASSPATH%" (
  echo gradle-wrapper.jar not found. Open this project in Android Studio to let it sync,
  echo or run "gradle wrapper" locally to regenerate the wrapper jar.
  exit /b 1
)

java -Dorg.gradle.appname=%~n0 -classpath "%CLASSPATH%" org.gradle.wrapper.GradleWrapperMain %*
