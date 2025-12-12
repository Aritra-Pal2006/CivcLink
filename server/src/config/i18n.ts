import i18next from 'i18next';
import Backend from 'i18next-fs-backend';
import path from 'path';

const i18n = i18next.createInstance();

i18n
    .use(Backend)
    .init({
        fallbackLng: 'en',
        supportedLngs: ['en', 'hi', 'bn', 'mr'],
        preload: ['en', 'hi', 'bn', 'mr'],
        ns: ['common'],
        defaultNS: 'common',
        backend: {
            loadPath: path.join(__dirname, '../../../frontend/public/locales/{{lng}}/{{ns}}.json')
        }
    });

export default i18n;
