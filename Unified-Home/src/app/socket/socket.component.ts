import { Component, OnInit } from '@angular/core';
import { ChartDataSets, ChartOptions } from "chart.js";
import { Color, Label } from "ng2-charts";
import { AngularFireDatabase } from "@angular/fire/database";
import { Observable } from "rxjs";

@Component({
  selector: 'app-socket',
  templateUrl: './socket.component.html',
  styleUrls: ['./socket.component.scss']
})
export class SocketComponent implements OnInit {
  public itemx: Observable<any>;
  public itemt: Observable<any>;
  public tPower: any;
  public socket: Observable<any>;
  public value: any;
  public open=false;
  public climit:any;

  public lineChartData: ChartDataSets[] = [{ data: [], label: "kW" }];
  public lineChartLabels: Label[] = [];
  public lineChartColors: Color[] = [
    {
      borderColor: "#A5D6A7",
      backgroundColor: "#C8E6C944"
    }
  ];
  public lineChartLegend = false;
  public lineChartType = "line";
  public lineChartPlugins = [];

  constructor(private db: AngularFireDatabase) {
    this.itemx = db.object("Socket-Stats/iPower").valueChanges();
    this.itemx.subscribe(data => {
      let datax = [];
      let datay = [];
      if (data) {
        Object.keys(data).forEach(key => {
          datax.push(data[key].value);
          let date = new Date(data[key].timestamp);
          datay.push(
            date.toLocaleString("en-US", {
              hour: "numeric",
              minute: "numeric",
              hour12: true
            })
          );
          let startTime = date.getTime();
          let endTime = new Date().getTime();
          let diffTime = (endTime - startTime) / (1000 * 60);
          if (diffTime > 4) {
            db.object(`Socket-Stats/iPower/${key}`).remove();
          }
        });

        this.lineChartData[0].data = datax;
        this.lineChartLabels = datay;
        this.lineChartData.slice();
        this.lineChartLabels.slice();
      }
    });
    this.itemt = db.object("Socket-Stats/tPower").valueChanges();
    this.itemt.subscribe(data => {
      this.tPower = data;
    });
    this.socket = db.object('Socket').valueChanges();
    this.socket.subscribe(value => {
      this.value = value.OnOff;
    });
  }

  changeState(val){
    const Socket = this.db.object('Socket');
    Socket.update({
      OnOff:val
    });
  }

  deletePower(){
    const Stats = this.db.object('Socket-Stats');
    Stats.update({
      tPower: 0,
    });
  }

  openSettings(){
    this.open=!this.open;
  }

  saveSettings($event){
    this.db.object('ConsumptionLimit').set($event.value);
  }

  ngOnInit() {
    this.db.object('ConsumptionLimit').valueChanges().subscribe(v=>{
      this.climit = v;
    });
  }

}
