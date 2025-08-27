import { afterAll, beforeAll } from "vitest";
import { database } from "../services/database.js";

beforeAll(async () => {
	await database.connect();
});

afterAll(async () => {
	await database.disconnect();
});
