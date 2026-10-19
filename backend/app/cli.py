"""Command-line user administration

Intended as an out-of-band recovery path, for example:

    docker compose exec backend python -m app.cli create-user --username alice --admin
    docker compose exec backend python -m app.cli reset-password --username alice
"""

import argparse
import getpass
import sys
from typing import Optional

from app.auth import hash_password
from app.database import Base, SessionLocal, engine
from app.models.user import User, UserSession
from app.schemas.user import MIN_PASSWORD_LENGTH


def _prompt_password(confirm: bool = True) -> str:
    while True:
        password = getpass.getpass("Password: ")
        if len(password) < MIN_PASSWORD_LENGTH:
            print(f"Password must be at least {MIN_PASSWORD_LENGTH} characters.", file=sys.stderr)
            continue
        if confirm:
            again = getpass.getpass("Confirm password: ")
            if password != again:
                print("Passwords did not match.", file=sys.stderr)
                continue
        return password


def _resolve_password(provided: Optional[str]) -> str:
    if provided:
        if len(provided) < MIN_PASSWORD_LENGTH:
            print(
                f"Password must be at least {MIN_PASSWORD_LENGTH} characters.",
                file=sys.stderr,
            )
            raise SystemExit(1)
        return provided
    return _prompt_password()


def cmd_create_user(args: argparse.Namespace) -> int:
    username = args.username.strip().lower()
    password = _resolve_password(args.password)

    db = SessionLocal()
    try:
        if db.query(User).filter(User.username == username).first():
            print(f"User '{username}' already exists.", file=sys.stderr)
            return 1

        user = User(
            username=username,
            display_name=args.display_name,
            password_hash=hash_password(password),
            is_admin=args.admin,
            is_active=True,
        )
        db.add(user)
        db.commit()
        print(f"Created {'admin' if args.admin else 'user'} '{username}'.")
        return 0
    finally:
        db.close()


def cmd_reset_password(args: argparse.Namespace) -> int:
    username = args.username.strip().lower()
    password = _resolve_password(args.password)

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == username).first()
        if user is None:
            print(f"User '{username}' not found.", file=sys.stderr)
            return 1

        user.password_hash = hash_password(password)
        # Force a fresh login everywhere after an out-of-band password reset.
        db.query(UserSession).filter(UserSession.user_id == user.id).delete(
            synchronize_session=False
        )
        db.commit()
        print(f"Password updated for '{username}'. All existing sessions were revoked.")
        return 0
    finally:
        db.close()


def cmd_list_users(_: argparse.Namespace) -> int:
    db = SessionLocal()
    try:
        users = db.query(User).order_by(User.username).all()
        if not users:
            print("No users exist yet. Open the web UI to create the first administrator.")
            return 0

        print(f"{'ID':<5}{'USERNAME':<24}{'ADMIN':<8}{'ACTIVE':<8}LAST LOGIN")
        for user in users:
            last_login = user.last_login_at.isoformat() if user.last_login_at else "never"
            print(
                f"{user.id:<5}{user.username:<24}"
                f"{'yes' if user.is_admin else 'no':<8}"
                f"{'yes' if user.is_active else 'no':<8}{last_login}"
            )
        return 0
    finally:
        db.close()


def cmd_set_admin(args: argparse.Namespace) -> int:
    username = args.username.strip().lower()

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == username).first()
        if user is None:
            print(f"User '{username}' not found.", file=sys.stderr)
            return 1

        user.is_admin = not args.revoke
        db.commit()
        print(f"User '{username}' is {'no longer' if args.revoke else 'now'} an administrator.")
        return 0
    finally:
        db.close()


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="python -m app.cli",
        description="BudgetingApp user administration",
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    create = subparsers.add_parser("create-user", help="Create a new user")
    create.add_argument("--username", required=True)
    create.add_argument("--password", help="Prompted for interactively when omitted")
    create.add_argument("--display-name", dest="display_name")
    create.add_argument("--admin", action="store_true", help="Grant administrator privileges")
    create.set_defaults(func=cmd_create_user)

    reset = subparsers.add_parser("reset-password", help="Reset a user's password")
    reset.add_argument("--username", required=True)
    reset.add_argument("--password", help="Prompted for interactively when omitted")
    reset.set_defaults(func=cmd_reset_password)

    listing = subparsers.add_parser("list-users", help="List all users")
    listing.set_defaults(func=cmd_list_users)

    admin = subparsers.add_parser("set-admin", help="Grant or revoke administrator privileges")
    admin.add_argument("--username", required=True)
    admin.add_argument("--revoke", action="store_true", help="Revoke instead of grant")
    admin.set_defaults(func=cmd_set_admin)

    return parser


def main() -> int:
    Base.metadata.create_all(bind=engine)
    args = build_parser().parse_args()
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
