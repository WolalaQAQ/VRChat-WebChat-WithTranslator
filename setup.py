from cx_Freeze import setup, Executable
import sys
import os

# Remove unnecessary modules
packages_to_exclude = ['tkinter', 'test', 'distutils', 'pydoc_data', 'lib2to3']

app_major_version = 1
app_minor_version = 0
app_patch_version = 5

build_exe_options = {
    "packages": ["flask", "pythonosc", "requests", "json", "logging", "webbrowser", "toml"],
    "excludes": packages_to_exclude,
    "include_files": [
        ('templates', 'templates'),
        ('static', 'static'),
        ('config.toml', 'config.toml')
    ],
    "include_msvcr": True,
    "optimize": 2,
    "build_exe": f"build/VRChat_WebChat"  # Custom output directory
}

setup(
    name="VRChat WebChat",
    version=f"{app_major_version}.{app_minor_version}.{app_patch_version}",
    description="VRChat WebChat with Translation Support",
    author="Wolala",
    options={"build_exe": build_exe_options},
    executables=[
        Executable(
            "app.py", 
            target_name="VRChat_WebChat.exe",
            copyright="Copyright © 2025"
        )
    ]
)
