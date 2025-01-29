from django.urls import path
from . import views

urlpatterns = [
    path("", views.home),
    path("logout", views.logout_view),
    # path('login/', views.login, name='login'),
    # path('test/', views.test, name='test'),
]
