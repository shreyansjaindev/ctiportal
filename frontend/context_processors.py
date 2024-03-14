from scripts.constants import APPS


def apps(request):
    return {"apps": APPS}


def add_user_to_context(request):
    return {"user": request.user}
