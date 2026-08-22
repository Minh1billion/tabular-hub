def test_me_requires_auth(client):
    response = client.get("/auth/me")
    assert response.status_code == 401

def test_me_returns_current_user(auth_client, test_user):
    response = auth_client.get("/auth/me")
    assert response.status_code == 200
    body = response.json()
    assert body["email"] == test_user.email
    assert body["display_name"] == test_user.display_name

def test_logout_returns_no_content(auth_client):
    response = auth_client.post("/auth/logout", follow_redirects=False)
    assert response.status_code == 204

def test_logout_clears_auth_cookie(auth_client):
    response = auth_client.post("/auth/logout", follow_redirects=False)
    set_cookie = response.headers.get("set-cookie", "")
    assert "access_token=" in set_cookie
    assert "Max-Age=0" in set_cookie