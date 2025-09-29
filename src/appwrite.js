// src/appwrite.js
import { Client, Account, Databases, ID, Query } from 'appwrite';

// These must exist in your .env at project root
// VITE_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
// VITE_APPWRITE_PROJECT=68d66f070010ecdb4e3d

export const client = new Client()
  .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)
  .setProject(import.meta.env.VITE_APPWRITE_PROJECT);

export const account = new Account(client);
export const databases = new Databases(client);

// re-export helpers so you can import them from '../appwrite'
export { ID, Query };
