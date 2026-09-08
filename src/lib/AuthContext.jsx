import React,{createContext,useContext,useEffect,useState} from "react"; import {api} from "@/api/client";
const C=createContext({user:null,loading:true});
export function AuthProvider({children}){const [user,setUser]=useState(null),[loading,setLoading]=useState(true); useEffect(()=>{api.auth.me().then(setUser).catch(()=>setUser(null)).finally(()=>setLoading(false))},[]); return <C.Provider value={{user,loading,refresh:async()=>setUser(await api.auth.me().catch(()=>null))}}>{children}</C.Provider>}
export const useAuth=()=>useContext(C);