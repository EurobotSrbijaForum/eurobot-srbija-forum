import os, requests, uuid, io, pytest

BASE = os.environ.get("REACT_APP_BACKEND_URL", "https://discussion-board-16.preview.emergentagent.com").rstrip("/")
API = f"{BASE}/api"

@pytest.fixture(scope="module")
def admin():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": "admin@forum.com", "password": "admin123"})
    assert r.status_code == 200, r.text
    assert r.json()["role"] == "admin"
    return s

@pytest.fixture(scope="module")
def demo():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": "demo@forum.com", "password": "demo123"})
    assert r.status_code == 200, r.text
    return s

def test_categories():
    r = requests.get(f"{API}/categories")
    assert r.status_code == 200
    cats = r.json()
    assert len(cats) >= 6
    slugs = {c["slug"] for c in cats}
    assert {"general","tech","design","gaming","music","random"}.issubset(slugs)

def test_register_and_me():
    s = requests.Session()
    email = f"test_{uuid.uuid4().hex[:8]}@x.com"
    r = s.post(f"{API}/auth/register", json={"email": email, "password": "pass123", "name": "Tester"})
    assert r.status_code == 200, r.text
    assert "session_token" in s.cookies
    r2 = s.get(f"{API}/auth/me")
    assert r2.status_code == 200 and r2.json()["email"] == email

def test_login_admin(admin):
    r = admin.get(f"{API}/auth/me")
    assert r.status_code == 200 and r.json()["role"] == "admin"

def test_login_demo(demo):
    r = demo.get(f"{API}/auth/me")
    assert r.status_code == 200

def test_thread_crud_vote_comment(demo, admin):
    # create
    r = demo.post(f"{API}/threads", json={"title":"TEST_t","body":"**hi**","category":"tech","tags":["test","x"]})
    assert r.status_code == 200, r.text
    t = r.json()
    assert t["score"] == 1 and t["upvotes"] == 1
    tid = t["thread_id"]
    # list
    r = requests.get(f"{API}/threads?sort=new&category=tech")
    assert r.status_code == 200 and any(x["thread_id"]==tid for x in r.json())
    # search
    r = requests.get(f"{API}/threads?q=TEST_t")
    assert any(x["thread_id"]==tid for x in r.json())
    # tag filter
    r = requests.get(f"{API}/threads?tag=test")
    assert any(x["thread_id"]==tid for x in r.json())
    # get one
    r = requests.get(f"{API}/threads/{tid}")
    assert r.status_code == 200
    # comment
    r = demo.post(f"{API}/comments", json={"thread_id": tid, "body":"hello"})
    assert r.status_code == 200
    cid = r.json()["comment_id"]
    r = requests.get(f"{API}/threads/{tid}/comments")
    assert r.status_code == 200 and any(c["comment_id"]==cid for c in r.json())
    # vote toggle: admin downvotes thread -> score should go to 0 (1 author + (-1) admin)
    r = admin.post(f"{API}/vote", json={"target_id":tid,"target_type":"thread","value":-1})
    assert r.status_code == 200 and r.json()["score"] == 0
    # remove vote
    r = admin.post(f"{API}/vote", json={"target_id":tid,"target_type":"thread","value":0})
    assert r.status_code == 200 and r.json()["score"] == 1
    # vote on comment
    r = admin.post(f"{API}/vote", json={"target_id":cid,"target_type":"comment","value":1})
    assert r.status_code == 200 and r.json()["score"] == 2
    # admin pin/lock
    r = admin.post(f"{API}/threads/{tid}/pin"); assert r.status_code == 200
    r = admin.post(f"{API}/threads/{tid}/lock"); assert r.status_code == 200
    # non-admin pin -> 403
    r = demo.post(f"{API}/threads/{tid}/pin"); assert r.status_code == 403
    # locked thread comment -> 403
    r = demo.post(f"{API}/comments", json={"thread_id":tid,"body":"x"}); assert r.status_code == 403
    # unlock
    r = admin.post(f"{API}/threads/{tid}/lock"); assert r.status_code == 200
    # delete by non-owner non-admin -> 403
    s2 = requests.Session()
    email = f"u_{uuid.uuid4().hex[:6]}@x.com"
    s2.post(f"{API}/auth/register", json={"email":email,"password":"p","name":"u"})
    r = s2.delete(f"{API}/threads/{tid}"); assert r.status_code == 403
    # delete by admin
    r = admin.delete(f"{API}/threads/{tid}"); assert r.status_code == 200

def test_profile_update(demo):
    r = demo.put(f"{API}/users/me", json={"bio":"updated bio TEST"})
    assert r.status_code == 200 and r.json()["bio"] == "updated bio TEST"
    uid = r.json()["user_id"]
    r = requests.get(f"{API}/users/{uid}")
    assert r.status_code == 200 and r.json()["bio"] == "updated bio TEST"
    r = requests.get(f"{API}/users/{uid}/threads")
    assert r.status_code == 200

def test_upload(demo):
    # 1x1 png
    png = bytes.fromhex("89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c63000100000005000100020d0a2db40000000049454e44ae426082")
    files = {"file": ("t.png", png, "image/png")}
    r = demo.post(f"{API}/upload", files=files)
    assert r.status_code == 200, r.text
    fid = r.json()["file_id"]
    r = requests.get(f"{BASE}/api/files/{fid}")
    assert r.status_code == 200 and r.headers["content-type"].startswith("image/")

def test_tags_and_stats():
    assert requests.get(f"{API}/tags/popular").status_code == 200
    r = requests.get(f"{API}/stats")
    assert r.status_code == 200 and "threads" in r.json()

def test_logout():
    s = requests.Session()
    s.post(f"{API}/auth/login", json={"email":"demo@forum.com","password":"demo123"})
    r = s.post(f"{API}/auth/logout"); assert r.status_code == 200
    r = s.get(f"{API}/auth/me"); assert r.status_code == 401

def test_unauth_thread_create():
    r = requests.post(f"{API}/threads", json={"title":"x","body":"x","category":"tech"})
    assert r.status_code == 401
