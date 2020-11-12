use mock;
db.createUser({
	user: "mock",
	pwd: "mock",
	roles: [
		{"role": "readWrite", db: "mock"}
	]
});