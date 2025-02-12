from fastapi import APIRouter, Depends, HTTPException
from heliclockter import datetime_utc, timedelta
from starlette import status

from bracket.config import config
from bracket.models.db.user import (
    User,
    UserPasswordToUpdate,
    UserPublic,
    UserToRegister,
    UserToUpdate,
)
from bracket.routes.auth import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    Token,
    create_access_token,
    user_authenticated,
)
from bracket.routes.models import SuccessResponse, TokenResponse, UserPublicResponse
from bracket.sql.users import (
    check_whether_email_is_in_use,
    create_user,
    get_user_by_id,
    update_user,
    update_user_password,
)
from bracket.utils.security import pwd_context
from bracket.utils.types import assert_some

router = APIRouter()


@router.get("/users/{user_id}", response_model=UserPublicResponse)
async def get_user(
    user_id: int, user_public: UserPublic = Depends(user_authenticated)
) -> UserPublicResponse:
    if user_public.id != user_id:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, 'Can\'t view details of this user')

    return UserPublicResponse(data=user_public)


@router.put("/users/{user_id}", response_model=UserPublicResponse)
async def put_user(
    user_id: int,
    user_to_update: UserToUpdate,
    user_public: UserPublic = Depends(user_authenticated),
) -> UserPublicResponse:
    if user_public.id != user_id:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, 'Can\'t change details of this user')

    await update_user(assert_some(user_public.id), user_to_update)
    user_updated = await get_user_by_id(user_id)
    return UserPublicResponse(data=assert_some(user_updated))


@router.put("/users/{user_id}/password", response_model=SuccessResponse)
async def put_user_password(
    user_id: int,
    user_to_update: UserPasswordToUpdate,
    user_public: UserPublic = Depends(user_authenticated),
) -> SuccessResponse:
    assert user_public.id == user_id
    await update_user_password(
        assert_some(user_public.id), pwd_context.hash(user_to_update.password)
    )
    return SuccessResponse()


@router.post("/users/register", response_model=TokenResponse)
async def register_user(user_to_register: UserToRegister) -> TokenResponse:
    if not config.allow_user_registration:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, 'Account creation is unavailable for now')

    user = User(
        email=user_to_register.email,
        password_hash=pwd_context.hash(user_to_register.password),
        name=user_to_register.name,
        created=datetime_utc.now(),
    )
    if await check_whether_email_is_in_use(user.email):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, 'Email address already in use')

    user_created = await create_user(user)
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"user": user_created.email}, expires_delta=access_token_expires
    )
    return TokenResponse(
        data=Token(
            access_token=access_token, token_type='bearer', user_id=assert_some(user_created.id)
        )
    )
