import { useState } from 'react';
import { useNavigate, useOutletContext } from "react-router-dom";

function LoginPage() {
    const navigate = useNavigate();
    const { setCurrentUser } = useOutletContext();
    const [formData, setFormData] = useState({
        username: '',
        password: ''
    });

    const handleInputChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch('http://localhost:5555/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                const userData = await response.json();
                setCurrentUser(userData.user);
                navigate('/game');
            } else {
                const errorData = await response.json();
                alert(errorData.error || 'Login failed');
            }
        } catch (error) {
            alert('Network error - please try again');
        }
    };

    return (
        <div className="login-container">
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <input 
                        type="text" 
                        name="username" 
                        placeholder="Enter Username" 
                        value={formData.username}
                        onChange={handleInputChange} 
                        required
                    />
                </div>
                <div className="form-group">
                    <input 
                        type="password" 
                        name="password" 
                        placeholder="Enter Password" 
                        value={formData.password}
                        onChange={handleInputChange} 
                        required
                    />
                </div>
                <button type="submit" className="login-button">
                    Login
                </button>
            </form>
        </div>
    );
}

export default LoginPage;