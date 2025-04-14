from cx_Freeze import setup, Executable
import sys
import os

# 移除不必要的模块
packages_to_exclude = ['tkinter', 'test', 'distutils', 'pydoc_data', 'lib2to3']

app_major_version = 1
app_minor_version = 0

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
    "build_exe": f"build/VRChat_WebChat_{app_major_version}-{app_minor_version}"  # 自定义输出目录
}

setup(
    name="VRChat WebChat",
    version=f"{app_major_version}.{app_minor_version}",
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
