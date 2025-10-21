import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ShowcaseNavigationComponent } from './shared/navigation/showcase-navigation.component';

@Component({
  imports: [RouterModule, ShowcaseNavigationComponent],
  selector: 'brand-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected title = 'dev-brand-ui';
}
