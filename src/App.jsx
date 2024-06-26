import { useState, useEffect } from "react";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import app from "./firebase.js"
import {getFirestore, addDoc, collection, getDocs, doc, deleteDoc} from "firebase/firestore";
import { authProvider, useAuth } from "./components/AuthChange.jsx";

import NewProject from "./components/NewProject.jsx";
import NoProjectSelected from "./components/NoProjectSelected.jsx";
import ProjectsSidebar from "./components/ProjectSidebar.jsx";
import SelectedProject from "./components/SelectedProject.jsx";
import LoginPage from "./components/LoginPage.jsx";
import SignUpPage from "./components/SignUpPage.jsx";

const AuthProvider = authProvider

function App(){
  return (
    <AuthProvider>
      <AppContent/>
    </AuthProvider>
  )
}


function AppContent() {
  const { user } = useAuth();
  const [projectsState, setProjectsState] = useState({
    selectedProjectId: undefined,
    projects: [],
    tasks: [],
  });

  //permanently added the projects on sidebar
 
  const db = getFirestore(app)

   useEffect(() => {
    const fetchProject = async () => {
      if (!user) return;

      const colRef = collection(db, "users", user.uid, "projects")
      const projectSnapshot = await getDocs(colRef)
    
      const projectList = projectSnapshot.docs.map(doc => ({
        id: doc.id, 
        ...doc.data(),
      }))
      setProjectsState(prevState => ({
        ...prevState,
        projects: projectList,
      }))
    }
    if (user) {
      fetchProject().catch(console.error)
    }
   }, [db, user])

  function handleAddTask(text) {
   if(!projectsState.selectedProjectId) return;

   const NewTask = {
    text: text,
    projectId: projectsState.selectedProjectId,
    createdAt: new Date()
   }

   const taskColRef = collection(db, "users", user.uid, "projects", projectsState.selectedProjectId, "tasks")
   
   addDoc(taskColRef, NewTask)
    .then((docRef) => {
      setProjectsState((prevState) => ({
      ...prevState,
      tasks :[
        {...NewTask, id: docRef.id},
        ...prevState.tasks
      ]
      }));
    })
    .catch((error) =>{
      console.log("Error in adding tasks: ", error)
    })
  };
    
  

  function handleDeleteTask(id) {
    if(!projectsState.selectedProjectId) return;
    console.log("id:", id)
    const taskDocRef = doc(db, "users", user.uid, "projects", projectsState.selectedProjectId, "tasks", id)

    deleteDoc(taskDocRef)
    .then(() =>{
      setProjectsState((prevState) => ({ 
        ...prevState,
        tasks: prevState.tasks.filter((task) => task.id !== id), 
      }));
    })
    .catch((error) =>{
      console.log("Error in deleting tasks:", error)
    })
  }

  function handleSelectProject(id) {
    setProjectsState((prevState) => ({
        ...prevState,
        selectedProjectId: id,
    }));
    if(!user) return;

    const taskColRef = collection(db, "users", user.uid, "projects", projectsState.selectedProjectId, "tasks")

    getDocs(taskColRef)
      .then((snapshot) =>{

        const taskList = snapshot.docs.map((doc) =>({
          id: doc.id,
          ...doc.data(),
        }))
        setProjectsState((prevState) =>({
          ...prevState,
          tasks: taskList,
        }))
      })
      .catch((error) => {
        console.log("error fetching tasks", error)
      })
  }

  function handleStartAddProject() {
    setProjectsState((prevState) => {
      return {
        ...prevState,
        selectedProjectId: null,
      };
    });
  }

  function handleCancelAddProject() {
    setProjectsState((prevState) => {
      return {
        ...prevState,
        selectedProjectId: undefined,
      };
    });
  }

  function handleAddProject(projectData) {
    
    const colRef = collection(db, "users", user.uid, "projects")

    addDoc(colRef, projectData)
    .then((docRef) => {
      setProjectsState((prevState) => {
        const newProject = {
         ...projectData,
         id: docRef.id,
        };
    
        return {
          ...prevState,
          selectedProjectId: undefined,
          projects: [...prevState.projects, newProject],
       };
      });
    })
    .catch((error) => {
      console.log("error", error)
    })
  }


  // deletes the project using deleteDoc..
  function handleDeleteProject(projectData) {

    if(!projectData || !projectData.id){
      console.log("Invalid project data")
      return;
    }
    
    const docRef = doc(db, "users", user.uid, "projects", projectData.id)
    
    deleteDoc(docRef)
      .then(() => {
         setProjectsState((prevState) => {
          return {
        ...prevState,
        selectedProjectId: undefined,
        projects: prevState.projects.filter(
          (project) => project.id !== projectData.id),
        };
      }) 
    })
    .catch((error) => {
      console.log("error deleting the project", error);
    })
  }

  const selectedProject = projectsState.projects.find(
    (project) => project.id === projectsState.selectedProjectId
  );

  let content = (
    <SelectedProject
      project={selectedProject}
      onDelete={handleDeleteProject}
      onAddTask={handleAddTask}
      onDeleteTask={handleDeleteTask}
      tasks={projectsState.tasks}
    />
  );

  if (projectsState.selectedProjectId === null) {
    content = (
      <NewProject onAdd={handleAddProject} onCancel={handleCancelAddProject} />
    );
  } else if (projectsState.selectedProjectId === undefined) {
    content = <NoProjectSelected onStartAddProject={handleStartAddProject} />;
  }

  const router = createBrowserRouter([
    {
      path: "/",
      element: <LoginPage />,
    },
    {
      path: "/dashboard",
      element: (
        <>
          <main className="h-screen flex gap-8">
            <ProjectsSidebar
              onStartAddProject={handleStartAddProject}
              projects={projectsState.projects}
              onSelectProject={handleSelectProject}
              selectedProjectId={projectsState.selectedProjectId}
            />
            {content}
          </main>
        </>
      ),
    },
    {
      path: "/signup",
      element: <SignUpPage />,
    },
  ]);

  return (
    <>
      <RouterProvider router={router} />
    </>
  );
}

export default App;