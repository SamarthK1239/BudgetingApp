#!/usr/bin/env python
"""
Entry point for the bundled backend executable.
This file is used by PyInstaller to create the standalone backend.
"""

import os
import sys
import uvicorn

# Add the current directory to the path for imports
if getattr(sys, 'frozen', False):
    # Running as compiled executable
    application_path = os.path.dirname(sys.executable)
    # Set up the data directory for SQLite database
    data_dir = os.path.join(os.path.expanduser("~"), ".budgetingapp")
    os.makedirs(data_dir, exist_ok=True)
    os.environ["DATABASE_PATH"] = os.path.join(data_dir, "budgeting.db")
else:
    # Running as script
    application_path = os.path.dirname(os.path.abspath(__file__))

# Change to application directory
os.chdir(application_path)

# Import the FastAPI app
from app.main import app


def main():
    """Run the backend server."""
    # Get port from environment or use default
    port = int(os.environ.get("PORT", 8000))
    host = os.environ.get("HOST", "127.0.0.1")
    
    print(f"Starting BudgetingApp backend server on {host}:{port}")
    
    # Run the server
    uvicorn.run(
        app,
        host=host,
        port=port,
        log_level="info",
        access_log=True
    )


if __name__ == "__main__":
    main()
