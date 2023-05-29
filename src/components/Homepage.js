import React, { useEffect, useState } from "react";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase.js";
import { useNavigate } from "react-router-dom";
import { uid } from "uid";
import { set, ref, onValue, remove, update } from "firebase/database";
import "./homepage.css";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import LogoutIcon from "@mui/icons-material/Logout";
import CheckIcon from "@mui/icons-material/Check";
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  query,
  orderBy,
  onSnapshot,
  deleteDoc,
} from "firebase/firestore";
import { firestore } from "../firebase.js";
import { serverTimestamp } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

export default function Homepage() {
  const [todo, setTodo] = useState("");
  const [todos, setTodos] = useState([]);
  const [filteredTodos, setFilteredTodos] = useState([]);
  const [isEdit, setIsEdit] = useState(false);
  const [tempId, setTempId] = useState("");
  const [category, setCategory] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [uniqueCategories, setUniqueCategories] = useState([]);
  const [dueDate, setDueDate] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [completedTasks, setCompletedTasks] = useState([]);
  const [selectedState, setSelectedState] = useState("");
  const [completed, setCompleted] = useState(false);
  const [selectedCalendar, setSelectedCalendar] = useState("");
  const [taskCount, setTaskCount] = useState(0);
  const [isDisabled, setIsDisabled] = useState(true);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      const user = auth.currentUser;
      if (user) {
        const userDocRef = doc(firestore, "users", user.uid);
        const todoCollectionRef = collection(userDocRef, "tasks");
        const querySnapshot = query(todoCollectionRef, orderBy("createdAt"));

        const unsubscribe = onSnapshot(querySnapshot, (snapshot) => {
          const todosData = [];
          snapshot.forEach((doc) => {
            const todo = { id: doc.id, ...doc.data() };
            todosData.push(todo);
          });
          setTodos(todosData);
          filterUniqueCategories(todosData);

          const completedTasks = todosData
            .filter((todo) => todo.completed)
            .map((todo) => todo.id);
          setCompletedTasks(completedTasks);
          setTaskCount(todosData.length);
        });

        const projectCollectionRef = collection(userDocRef, "projects");
        const projectQuerySnapshot = query(projectCollectionRef);

        const unsubscribeProjects = onSnapshot(
          projectQuerySnapshot,
          (snapshot) => {
            const projectsData = [];
            snapshot.forEach((doc) => {
              const project = { id: doc.id, ...doc.data() };
              projectsData.push(project);
            });
          }
        );

        return () => {
          unsubscribe();
          unsubscribeProjects();
        };
      } else {
        navigate("/");
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    // обновляем значение taskCount после фильтрации задач
    setTaskCount(filteredTodos.length);
  }, [filteredTodos]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDate(new Date());
    }, 60000); // Обновлять каждую минуту

    return () => {
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    setIsDisabled(todo === "" || category === "" || dueDate === null);
  }, [todo, category, dueDate]);

  const handleSignOut = () => {
    signOut(auth)
      .then(() => {
        navigate("/");
      })
      .catch((err) => {
        alert(err.message);
      });
  };

  const writeToDatabase = async () => {
    const userDocRef = doc(firestore, "users", auth.currentUser.uid);
    const todoCollectionRef = collection(userDocRef, "tasks");

    try {
      await addDoc(todoCollectionRef, {
        task: todo,
        category: category,
        dueDate: dueDate ? dueDate.toISOString() : null,
        completed: false,
        createdAt: serverTimestamp(),
      });

      setTodo("");
      setCategory("");
      setDueDate(null);
    } catch (error) {
      alert(error.message);
    }
  };

  const filterTasksByCalendar = (calendar) => {
    setSelectedCalendar(calendar);

    const currentDate = new Date();

    if (calendar === "today") {
      const filtered = todos.filter(
        (todo) =>
          !todo.completed &&
          todo.dueDate &&
          new Date(todo.dueDate).toLocaleDateString() ===
            currentDate.toLocaleDateString() &&
          new Date(todo.dueDate).getTime() >= currentDate.getTime()
      );
      setFilteredTodos(filtered);
    } else if (calendar === "week") {
      const endDate = new Date();
      endDate.setDate(currentDate.getDate() + 7);
      const filtered = todos.filter(
        (todo) =>
          !todo.completed &&
          todo.dueDate &&
          new Date(todo.dueDate) >= currentDate &&
          new Date(todo.dueDate) <= endDate
      );
      setFilteredTodos(filtered);
    } else if (calendar === "month") {
      const endDate = new Date();
      endDate.setMonth(currentDate.getMonth() + 1);
      const filtered = todos.filter(
        (todo) =>
          !todo.completed &&
          todo.dueDate &&
          new Date(todo.dueDate) >= currentDate &&
          new Date(todo.dueDate) <= endDate
      );
      setFilteredTodos(filtered);

      setTaskCount(filtered.length);
    } else {
      setFilteredTodos(todos);
    }
  };

  // Функция для фильтрации задач по состоянию
  const filterTasksByState = (state) => {
    setSelectedState(state);

    if (state === "overdue") {
      const filtered = todos.filter(
        (todo) => new Date(todo.dueDate).getTime() < currentDate.getTime()
      );
      setFilteredTodos(filtered);
    } else if (state === "completed") {
      const filtered = todos.filter((todo) => completedTasks.includes(todo.id));
      setFilteredTodos(filtered);
    } else if (state === "active") {
      const filtered = todos.filter(
        (todo) =>
          !completedTasks.includes(todo.id) &&
          (!todo.dueDate ||
            new Date(todo.dueDate).getTime() >= currentDate.getTime())
      );
      setFilteredTodos(filtered);

      setTaskCount(filtered.length);
    } else {
      setFilteredTodos(todos);
    }
  };

  const handleUpdate = (todo) => {
    setIsEdit(true);
    setTodo(todo.task);
    setCategory(todo.category);
    setDueDate(todo.dueDate ? new Date(todo.dueDate) : null);
    setTempId(todo.id);
  };

  const handleEditConfirm = async () => {
    const userDocRef = doc(firestore, "users", auth.currentUser.uid);
    const todoDocRef = doc(userDocRef, "tasks", tempId);

    try {
      await updateDoc(todoDocRef, {
        task: todo,
        category: category,
        dueDate: dueDate ? dueDate.toISOString() : null,
        completed: completedTasks.includes(tempId),
      });

      setTodo("");
      setCategory("");
      setDueDate(null);
      setIsEdit(false);
    } catch (error) {
      alert(error.message);
    }
  };

  const handleTaskCompletion = async (taskId) => {
    const task = todos.find((todo) => todo.id === taskId);

    if (task && new Date(task.dueDate).getTime() < currentDate.getTime()) {
      // Задача просрочена, поэтому не выполняем обновление статуса
      return;
    }

    const updatedCompletedTasks = completedTasks.includes(taskId)
      ? completedTasks.filter((id) => id !== taskId)
      : [...completedTasks, taskId];

    setCompletedTasks(updatedCompletedTasks);
    setCompleted(updatedCompletedTasks.includes(taskId));

    try {
      const userDocRef = doc(firestore, "users", auth.currentUser.uid);
      const todoDocRef = doc(userDocRef, "tasks", taskId);

      await updateDoc(todoDocRef, {
        completed: updatedCompletedTasks.includes(taskId),
      });
    } catch (error) {
      console.error("Error updating task completion:", error);
    }
  };

  const handleDelete = (id) => {
    const userDocRef = doc(firestore, "users", auth.currentUser.uid);
    const todoDocRef = doc(userDocRef, "tasks", id);

    deleteDoc(todoDocRef)
      .then(() => {
        console.log("Document deleted!");
      })
      .catch((err) => {
        alert(err.message);
      });
  };

  const filterUniqueCategories = (todosData) => {
    const categories = todosData.map((todo) => todo.category);
    const uniqueCategories = Array.from(new Set(categories));
    setUniqueCategories(uniqueCategories);
  };

  useEffect(() => {
    if (selectedCategory === "") {
      setFilteredTodos(todos);
    } else {
      const filtered = todos.filter(
        (todo) => todo.category === selectedCategory
      );
      setFilteredTodos(filtered);
    }
  }, [selectedCategory, todos]);

  const resetFilters = () => {
    setSelectedCategory("");
    setSelectedCalendar("");
    filterUniqueCategories(todos);
    setFilteredTodos(todos);
    setTaskCount(todos.length);
  };

  return (
    <div className="homepage">
      <div className="eclipse"></div>
      <div className="eclipse2"></div>
      <div className="wrapper">
        <div className="side_bar">
          <div className="btn_box">
            <button
              className={`btn_all ${selectedState === "" ? "selected" : ""}`}
              onClick={resetFilters}
            >
              All Tasks
            </button>
          </div>
          <div className="calendar-list">
            <h2 className="zag">Сoming tasks</h2>
            <div
              className={`calendar-item ${
                selectedCalendar === "today" ? "selected" : ""
              }`}
              onClick={() => filterTasksByCalendar("today")}
            >
              Today
            </div>
            <div
              className={`calendar-item ${
                selectedCalendar === "week" ? "selected" : ""
              }`}
              onClick={() => filterTasksByCalendar("week")}
            >
              Next 7 days
            </div>
            <div
              className={`calendar-item ${
                selectedCalendar === "month" ? "selected" : ""
              }`}
              onClick={() => filterTasksByCalendar("month")}
            >
              Next 30 days
            </div>
          </div>
          <div className="state-list">
            <h2 className="zag">Status</h2>
            <div
              className={`state-item ${
                selectedState === "overdue" ? "selected" : ""
              }`}
              onClick={() => filterTasksByState("overdue")}
            >
              Overdue
            </div>
            <div
              className={`state-item ${
                selectedState === "completed" ? "selected" : ""
              }`}
              onClick={() => filterTasksByState("completed")}
            >
              Completed
            </div>
            <div
              className={`state-item ${
                selectedState === "active" ? "selected" : ""
              }`}
              onClick={() => filterTasksByState("active")}
            >
              Active
            </div>
          </div>
          <div className="category-list">
            <h2 className="zag">Category</h2>
            {uniqueCategories.map((category) => (
              <div
                className={`category-item ${
                  selectedCategory === category ? "selected" : ""
                }`}
                key={category}
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </div>
            ))}
          </div>
        </div>

        <div className="box_todo">
          <div className="box_i">
            {isEdit ? (
              <div>
                <CheckIcon
                  onClick={handleEditConfirm}
                  className="add-confirm-icon"
                />
              </div>
            ) : (
              <div>
                <AddIcon
                  onClick={writeToDatabase}
                  className={`add-confirm-icon ${isDisabled ? "disabled" : ""}`}
                  disabled={isDisabled}
                />
              </div>
            )}
          </div>
          <h2 className="zag">Add your Todo</h2>
          <input
            className="add-edit-input"
            type="text"
            placeholder="Add name..."
            value={todo}
            onChange={(e) => setTodo(e.target.value)}
          />
          <div>
            <DatePicker
              selected={dueDate}
              onChange={(date) => setDueDate(date)}
              placeholderText="Select due date and time"
              className="add-edit-input"
              showTimeSelect
              timeFormat="HH:mm"
              dateFormat="MMMM d, yyyy h:mm aa"
              timeCaption="Time"
            />
          </div>
          <input
            className="add-edit-input"
            type="text"
            placeholder="Category..."
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
          <div>
            <p className="task-count">total tasks here: {taskCount}</p>
          </div>
          {filteredTodos.map((todo) => (
            <div
              className={`todo ${
                new Date(todo.dueDate).getTime() < currentDate.getTime()
                  ? "overdue"
                  : ""
              } ${completedTasks.includes(todo.id) ? "completed" : ""}`}
              key={todo.id}
            >
              <input
                type="checkbox"
                checked={completedTasks.includes(todo.id)}
                onChange={() => handleTaskCompletion(todo.id)}
                onClick={(e) => e.stopPropagation()}
              />

              <span className="span-item">{todo.task}</span>
              <span className="category-item">{todo.category}</span>
              <span className="due-date-item">
                {todo.dueDate && new Date(todo.dueDate).toLocaleString()}
              </span>
              <div className="icon-box">
                <EditIcon
                  fontSize="small"
                  onClick={() => handleUpdate(todo)}
                  className="edit-button"
                />
                <DeleteIcon
                  fontSize="small"
                  onClick={() => handleDelete(todo.id)}
                  className="delete-button"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <LogoutIcon onClick={handleSignOut} className="logout-icon" />
    </div>
  );
}
