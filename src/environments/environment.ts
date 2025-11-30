// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  //  apiUrl: 'http://localhost:4000/api',
  //  socketUrl: 'http://localhost:4000',

  apiUrl: 'https://mapapi.robertogroup.org/api',
  socketUrl: 'https://mapapi.robertogroup.org',
  // Configuración de CORS (si es necesario)
  corsOrigins: [
    'http://localhost:4200',
    'http://127.0.0.1:4200',
    'http://localhost:4401',
    'http://127.0.0.1:4401'
  ]
};

