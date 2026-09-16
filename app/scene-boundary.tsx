import {Component,type ReactNode} from 'react';
/** Keep the controls and reload action available if the deferred viewer fails to load. */
export default class SceneBoundary extends Component<{children:ReactNode;onError:(message:string)=>void},{failed:boolean}>{
 state={failed:false};
 static getDerivedStateFromError(){return{failed:true};}
 componentDidCatch(){this.props.onError('The 3D viewer could not be loaded. Please reload the viewer.');}
 render(){return this.state.failed?null:this.props.children;}
}
