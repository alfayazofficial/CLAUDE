from hospital_gateway.storage.database import Database
def test_database_initializes(tmp_path):
 db=Database(tmp_path/"gateway.sqlite3")
 with db.connect() as c: assert c.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()
