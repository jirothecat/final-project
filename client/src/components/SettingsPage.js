import { useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';

function SettingsPage() {
    const { darkMode, setDarkMode } = useOutletContext();

    useEffect(() => {
        // Update body class when dark mode changes
        document.body.classList.toggle('dark-mode', darkMode);
    }, [darkMode]);

    const handleThemeToggle = () => {
        setDarkMode(prevMode => {
            const newMode = !prevMode;
            localStorage.setItem('darkMode', JSON.stringify(newMode));
            return newMode;
        });
    };

    return (
        <div className="settings-page">
            <h2>Settings</h2>
            <div className="settings-container">
                <div className="settings-group">
                    <h3>Display Settings</h3>
                    <div className="setting-item">
                        <span>Dark Mode</span>
                        <label className="toggle-switch">
                            <input
                                type="checkbox"
                                checked={darkMode}
                                onChange={handleThemeToggle}
                            />
                            <span className="toggle-slider"></span>
                        </label>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default SettingsPage;