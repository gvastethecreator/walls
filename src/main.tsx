import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { createRoot } from 'react-dom/client';
import App from './App';
import { I18nProvider } from './i18n';
import './styles.css';

gsap.registerPlugin(useGSAP);

const rootElement = document.getElementById('root');
if (!rootElement) {
    throw new Error('Root element not found');
}

createRoot(rootElement).render(
    <I18nProvider>
        <App />
    </I18nProvider>,
);
