"use client";
import {useEffect,useRef,useState} from "react";
import type {Map as LeafletMap,Marker} from "leaflet";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

export function MapPicker({defaultLat=46.603354,defaultLng=1.888334}:{defaultLat?:number;defaultLng?:number}){
  const container=useRef<HTMLDivElement>(null);const map=useRef<LeafletMap|null>(null);const marker=useRef<Marker|null>(null);const [position,setPosition]=useState<[number,number]|null>(null);
  useEffect(()=>{let cancelled=false;void import("leaflet").then(L=>{if(cancelled||!container.current||map.current)return;L.Icon.Default.mergeOptions({iconUrl:markerIcon.src,iconRetinaUrl:markerIcon2x.src,shadowUrl:markerShadow.src});const instance=L.map(container.current).setView([defaultLat,defaultLng],6);L.tileLayer(process.env.NEXT_PUBLIC_MAP_TILE_URL||"https://tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:process.env.NEXT_PUBLIC_MAP_ATTRIBUTION||'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(instance);instance.on("click",event=>{const point:[number,number]=[event.latlng.lat,event.latlng.lng];setPosition(point);if(marker.current)marker.current.setLatLng(event.latlng);else marker.current=L.marker(event.latlng).addTo(instance)});map.current=instance});return()=>{cancelled=true;map.current?.remove();map.current=null}},[defaultLat,defaultLng]);
  return <div><div ref={container} className="leaflet-map"/><input type="hidden" name="latitude" value={position?.[0]??""}/><input type="hidden" name="longitude" value={position?.[1]??""}/><small>{position?`Coordonnées enregistrées : ${position[0].toFixed(6)}, ${position[1].toFixed(6)}`:"Cliquez sur la carte pour placer le point de rendez-vous exact."}</small></div>;
}
