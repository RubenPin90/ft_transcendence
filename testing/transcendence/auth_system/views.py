from django.http import HttpResponse
from django.template import loader
from django.shortcuts import render, redirect
from django.contrib.auth import logout


def home(request):
    return render(request, "home.html")


def logout_view(request):
    logout(request)
    return redirect("/")


# def login(request):
#     template = loader.get_template("login.html")
#     message = None
#     if request.method == 'POST':
#         if 'my_button' in request.POST:
#             message = 'Button wurde geklickt!'
#             return render(request, 'login.html', {'message':message})
#     return HttpResponse(template.render())


# def test(request):
#     message = None
#     if request.method == 'POST':
#         if 'my_button' in request.POST:
#             message = 'Button wurde geklickt!'
#     return render(request, 'login.html', {'message':message})
