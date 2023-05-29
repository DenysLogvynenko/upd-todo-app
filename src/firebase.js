import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
 import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";



const firebaseConfig = {
  apiKey: "AIzaSyAMeRZFq6wFtULok8fmOjeeePUfzQfNitY",
  authDomain: "upd-todo.firebaseapp.com",
  databaseURL: "https://upd-todo-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "upd-todo",
  storageBucket: "upd-todo.appspot.com",
  messagingSenderId: "703016465682",
  appId: "1:703016465682:web:4fb1238b3b08138c3cefcb"
};

const app = initializeApp(firebaseConfig);
export const firestore = getFirestore(app);
export const db = getDatabase(app);
export const auth = getAuth();




