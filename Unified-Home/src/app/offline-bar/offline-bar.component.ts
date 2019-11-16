import { Component, OnInit } from "@angular/core";
import { Observable, fromEvent, merge } from "rxjs";
import { map } from "rxjs/operators";
import {style, state, animate, transition, trigger} from '@angular/animations';

@Component({
  selector: "app-offline-bar",
  templateUrl: "./offline-bar.component.html",
  styleUrls: ["./offline-bar.component.scss"],
  animations: [
    trigger('fadeInOut', [
      transition(':enter', [
        style({bottom:-25}),
        animate(200, style({bottom:0}))
      ]),
      transition(':leave', [
        animate(200, style({bottom:-25}))
      ])
    ])
  ]
})
export class OfflineBarComponent implements OnInit {

  createOnline$() {
    return merge(
      fromEvent(window, "offline").pipe(map(() => false)),
      fromEvent(window, "online").pipe(map(() => true)),
      Observable.create(sub => {
        sub.next(navigator.onLine);
        sub.complete();
      })
    );
  }

  public online = this.createOnline$();

  constructor() {}

  ngOnInit() {
  }


}
