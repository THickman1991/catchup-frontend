// src/appwrite.js
import { Client, Account, Databases } from "appwrite";

/*
  We prefer to read settings from .env (Vite will inject variables
  that start with VITE_). If .env isn't being picked up yet, we fall
  back to hard-coded values so you can keep going.
*/

// Preferred (from .env)
const envEndpoint = import.meta.env.VITE_APPWRITE_ENDPOINT;
const envProject  = import.meta.env.VITE_APPWRITE_PROJECT;

// TEMP fallback values (edit this line ONLY: put your real Project ID between quotes)
const fallbackProjectId = "68d66f070010ecdb4e3d"; // e.g. "68d66f070010ecdb4e3d"

// Choose values (env first, fallback second)
const endpoint = envEndpoint || "https://cloud.appwrite.io/v1";
const project  = envProject  || fallbackProjectId;

// Tiny log to help us see what the app is using
console.log("Appwrite config in use:", { endpoint, project });

export const client  = new Client().setEndpoint(endpoint).setProject(project);
export const account = new Account(client);
export const db      = new Databases(client);

