import React, { useEffect, useState } from 'react';
import { IntlProvider } from 'react-intl';
//import { buscaTraduccion } from "@/app/api-endpoints/traduccion";
//import { getIdiomaDefecto } from '../components/shared/componentes';

const IntlProviderWrapper = ({ children }) => {
    const [messages, setMessages] = useState(null);

    //const locale = getIdiomaDefecto();

    useEffect(() => {
        const fetchTranslations = async () => {
            const traducciones = await buscaTraduccion(locale);
            setMessages(traducciones);
        };

        fetchTranslations();
    });

    return (
        <IntlProvider messages={messages}>
            {children}
        </IntlProvider>
    );
};

export default IntlProviderWrapper;