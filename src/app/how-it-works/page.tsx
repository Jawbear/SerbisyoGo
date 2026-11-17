import type {Metadata} from 'next';
import {InformationPage} from '@/features/information/pages';
export const metadata:Metadata={title:"How It Works",description:"How It Works for SerbisyoGo: local home services, clear booking records and private document review."};
export default function Page(){return <InformationPage page="how-it-works"/>;}
