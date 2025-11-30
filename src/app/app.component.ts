import { Component } from '@angular/core';
import { MapViewComponent } from './map-view/map-view.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [MapViewComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'fleet-tracking';
}
