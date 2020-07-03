import React, {useState} from 'react';
import './App.css';
import 'semantic-ui-css/semantic.min.css';
import Footer from './components/footer';
import { BrowserRouter as Router} from 'react-router-dom';
import AppRouting from "./components/app_routing";
import HeaderCard from "./components/header_card";

function App() {
  const [user, setUser] = useState({
    display_name: '',
    id: '',
  });

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
        <HeaderCard name={displayName}/>
        <div style={{
          marginTop: '3vh'
        }}>
          <Router>
            <AppRouting user={user} setUser={setUser} />
          </Router>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default App;
