#!/usr/bin/env python
"""
Build script for packaging the Python backend into a standalone executable.
Uses PyInstaller to create a single executable that includes all dependencies.
"""

import subprocess
import sys
import os
import shutil
from pathlib import Path

# Get the backend directory
BACKEND_DIR = Path(__file__).parent
DIST_DIR = BACKEND_DIR / "dist"
BUILD_DIR = BACKEND_DIR / "build"


def clean_build():
    """Clean previous build artifacts."""
    print("Cleaning previous build artifacts...")
    
    if DIST_DIR.exists():
        shutil.rmtree(DIST_DIR)
    if BUILD_DIR.exists():
        shutil.rmtree(BUILD_DIR)
    
    # Remove spec file if exists
    spec_file = BACKEND_DIR / "backend.spec"
    if spec_file.exists():
        spec_file.unlink()
    
    print("Clean complete.")


def install_pyinstaller():
    """Ensure PyInstaller is installed."""
    print("Checking PyInstaller installation...")
    try:
        import PyInstaller
        print(f"PyInstaller {PyInstaller.__version__} is installed.")
    except ImportError:
        print("Installing PyInstaller...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "pyinstaller"])
        print("PyInstaller installed successfully.")


def build_executable():
    """Build the backend executable using PyInstaller."""
    print("Building backend executable...")
    
    # PyInstaller command
    cmd = [
        sys.executable, "-m", "PyInstaller",
        "--onefile",  # Single executable
        "--name", "backend",  # Output name
        "--distpath", str(DIST_DIR),
        "--workpath", str(BUILD_DIR),
        "--specpath", str(BACKEND_DIR),
        # Hidden imports that PyInstaller might miss
        "--hidden-import", "uvicorn.logging",
        "--hidden-import", "uvicorn.loops",
        "--hidden-import", "uvicorn.loops.auto",
        "--hidden-import", "uvicorn.protocols",
        "--hidden-import", "uvicorn.protocols.http",
        "--hidden-import", "uvicorn.protocols.http.auto",
        "--hidden-import", "uvicorn.protocols.websockets",
        "--hidden-import", "uvicorn.protocols.websockets.auto",
        "--hidden-import", "uvicorn.lifespan",
        "--hidden-import", "uvicorn.lifespan.on",
        "--hidden-import", "uvicorn.lifespan.off",
        "--hidden-import", "sqlalchemy.sql.default_comparator",
        "--hidden-import", "sqlalchemy.dialects.sqlite",
        "--hidden-import", "pandas._libs.tslibs.timedeltas",
        "--hidden-import", "pandas._libs.tslibs.nattype",
        "--hidden-import", "pandas._libs.tslibs.np_datetime",
        # Add data files
        "--add-data", f"alembic.ini{os.pathsep}.",
        "--add-data", f"alembic{os.pathsep}alembic",
        # Console mode for debugging (change to --noconsole for release)
        "--console",
        # Entry point
        "backend_entry.py"
    ]
    
    # Run PyInstaller
    subprocess.check_call(cmd, cwd=str(BACKEND_DIR))
    
    print(f"Build complete! Executable created at: {DIST_DIR / 'backend.exe'}")


def main():
    """Main build process."""
    print("=" * 60)
    print("Building BudgetingApp Backend")
    print("=" * 60)
    
    try:
        clean_build()
        install_pyinstaller()
        build_executable()
        
        print("\n" + "=" * 60)
        print("BUILD SUCCESSFUL!")
        print("=" * 60)
        print(f"\nThe backend executable is located at:")
        print(f"  {DIST_DIR / 'backend.exe'}")
        print("\nNext steps:")
        print("  1. Run 'npm run electron-build-win' in the frontend directory")
        print("  2. The complete app will be in frontend/dist/")
        
    except subprocess.CalledProcessError as e:
        print(f"\nBUILD FAILED: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\nBUILD FAILED: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
