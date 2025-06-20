// src/main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { registerLicense } from '@syncfusion/ej2-base'; // Import registerLicense
import { provideRouter } from '@angular/router';
import { routes } from './app/app.routes';

    import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';

    ModuleRegistry.registerModules([ AllCommunityModule ]);

// Registering Syncfusion license key
registerLicense('Ngo9BigBOggjHTQxAR8/V1NNaF1cWGhPYVF1WmFZfVtgfV9HaFZVQWY/P1ZhSXxWdkBhXX1fcX1XRWReVUR9XUs='); // <-- Replace with your actual key

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes)
  ]
})
  .catch((err) => console.error(err));