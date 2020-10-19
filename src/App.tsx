import React, {useState} from 'react';
import './App.css';
import 'semantic-ui-css/semantic.min.css';
import { BrowserRouter as Router, } from 'react-router-dom';
import AppRouting from "./components/app_routing";
import HeaderCard from "./components/header_card";

function App() {
  const [user, setUser] = useState({
    display_name: '',
    id: '',
  });
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const displayName = user.display_name ? user.display_name : user.id;
  return (
    <div
      className="App"
      style={{
       display: 'flex',
       minHeight: '100vh',
       flexDirection: 'column',
      }}
    >
      <div style={{
        flex: 1,
        marginTop: '3vh'
      }}>
        <Router>
          <HeaderCard
            name={displayName}
            setUser={setUser}
            setIsLoggedIn={setIsLoggedIn}
          />
          <div style={{
            marginTop: '3vh'
          }}>
          <AppRouting
            user={user}
            setUser={setUser}
            isLoggedIn={isLoggedIn}
            setIsLoggedIn={setIsLoggedIn}
          />
        </div>
      </Router>
      </div>
    </div>
  );
}

export default App;
