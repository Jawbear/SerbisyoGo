import type {Metadata} from 'next';
import {InformationPage} from '@/features/information/pages';
export const metadata:Metadata={title:"FAQ",description:"FAQ for SerbisyoGo: local home services, clear booking records and private document review."};
export default function Page(){return <InformationPage page="faq"/>;}
