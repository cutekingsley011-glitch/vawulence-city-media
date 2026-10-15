import { useEffect, useState, type ReactNode } from 'react';
import { CheckCircle, Heart, MessageCircle, Users } from 'lucide-react';
import { api } from '@appdeploy/client';
import { ensureMember, getMemberToken } from './MemberGate';
import { MediaUpload } from './MediaUpload';
import './remaining.css';

type Props = { go?: (path: string) => void };
const rawWa = String(import.meta.env.VITE_ADMIN_WA ?? '');
const waDigits = rawWa.replace(/\D/g, '');
const cleanAdminWa = waDigits.length >= 10 && waDigits.length <= 15 ? waDigits : '2348030430681';
const ADMIN_WA = '+' + cleanAdminWa;

const ages = ['18-20', '20-25', '25-30', '30-35'];
const genders = ['Male', 'Female', 'Non-binary', 'Prefer not to say'];
const looking = ['Male', 'Female', 'Bi', 'Gay', 'Lesbian'];
const states = ['Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno','Cross River','Delta','Ebonyi','Edo','Ekiti','Enugu','FCT','Gombe','Imo','Jigawa','Kaduna','Kano','Katsina','Kebbi','Kogi','Kwara','Lagos','Nasarawa','Niger','Ogun','Ondo','Osun','Oyo','Plateau','Rivers','Sokoto','Taraba','Yobe','Zamfara'];

export default function ConnectionsFixed() {
    const [tab, setTab] = useState<'browse' | 'submit'>('browse');
    const [profiles, setProfiles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitted, setSubmitted] = useState(false);
    const [busy, setBusy] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [form, setForm] = useState({name:'',ageBracket:'',gender:'',state:'',photoUrl:'',lookingFor:'',lookingForAge:'',preferredLocation:'',whatsappNumber:'',bioText:'',consent:false});

    const loadProfiles = async (showLoading = false) => {
        if (showLoading) setLoading(true);
        try {
            const r = await api.get(`/api/connections?refresh=${Date.now()}`);
            setProfiles(Array.isArray(r.data) ? r.data : []);
        } catch {
            setProfiles([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadProfiles(true);
        const refresh = () => { if (document.visibilityState === 'visible') void loadProfiles(false); };
        window.addEventListener('focus', refresh);
        window.addEventListener('pageshow', refresh);
        document.addEventListener('visibilitychange', refresh);
        return () => {
            window.removeEventListener('focus', refresh);
            window.removeEventListener('pageshow', refresh);
            document.removeEventListener('visibilitychange', refresh);
        };
    }, []);

    const set = (key: string, value: string | boolean) => setForm(current => ({ ...current, [key]: value }));
    const switchTab = (next: 'browse' | 'submit') => { setTab(next); if (next === 'submit') setErrors({}); else void loadProfiles(false); };
    const validate = () => {
        const e: Record<string, string> = {};
        if (!form.name.trim()) e.name = 'Name is required.';
        if (!form.ageBracket) e.ageBracket = 'Age bracket is required.';
        if (!form.gender) e.gender = 'Gender is required.';
        if (!form.state) e.state = 'State is required.';
        if (!form.lookingFor) e.lookingFor = 'Looking for is required.';
        if (!form.lookingForAge) e.lookingForAge = 'Preferred age range is required.';
        if (!form.preferredLocation) e.preferredLocation = 'Preferred location is required.';
        if (!form.whatsappNumber.trim()) e.whatsappNumber = 'WhatsApp number is required.';
        if (!form.photoUrl.trim()) e.photoUrl = 'A profile photo is required.';
        if (!form.bioText.trim()) e.bioText = 'About you is required.';
        if (!form.consent) e.consent = 'You must confirm the consent statement.';
        return e;
    };
    async function submit(e: React.FormEvent) {
        e.preventDefault();
        if (!(await ensureMember())) return;
        const nextErrors = validate();
        setErrors(nextErrors);
        if (Object.keys(nextErrors).length) return;
        setBusy(true);
        try {
            await api.post('/api/connections', { ...form, memberToken: getMemberToken(), name: form.name.trim(), photoUrl: form.photoUrl.trim(), whatsappNumber: form.whatsappNumber.trim(), bioText: form.bioText.trim(), consentGiven: true });
            setSubmitted(true);
            setForm({name:'',ageBracket:'',gender:'',state:'',photoUrl:'',lookingFor:'',lookingForAge:'',preferredLocation:'',whatsappNumber:'',bioText:'',consent:false});
        } catch (e: any) {
            setErrors({ submit: e?.response?.data?.message || 'Submission failed. Please try again.' });
        } finally { setBusy(false); }
    }

    return <Page title='Connections' eyebrow='VCM CONNECTIONS'><p className='subtitle'>Find your match within the VCM community.</p>
        <div className='connection-tabs'><button className={tab === 'browse' ? 'selected' : ''} onClick={() => switchTab('browse')}>Browse Profiles</button><button className={tab === 'submit' ? 'selected' : ''} onClick={() => switchTab('submit')}>Submit Your Profile</button></div>
        {tab === 'browse' ? <div className='connection-grid'>{loading ? [1,2,3].map(i => <div className='connection-skeleton' key={i}/>) : profiles.length ? profiles.map(p => <article className='connection-card' key={p.id}><div className='connection-photo-wrap'>{p.photoUrl ? <img src={p.photoUrl} alt={p.name}/> : <div className='connection-photo-fallback'><Users size={42}/></div>}</div><div className='connection-copy'><div className='connection-head'><h3>{p.name}</h3><span>{p.ageBracket}</span></div><small>📍 {p.state}{p.gender ? ` · ${p.gender}` : ''}</small><p>Looking for: <b>{p.lookingFor}</b>{p.lookingForAge ? ` · ${p.lookingForAge}` : ''}</p>{p.preferredLocation && <p>Preferred location: <b>{p.preferredLocation}</b></p>}<p className='connection-bio'>{p.bioText}</p><a className='connection-contact' href={`https://wa.me/${cleanAdminWa}?text=${encodeURIComponent(`Hi, I'd like contact info for ${p.name}'s profile on VCM Connections`)}`} target='_blank' rel='noreferrer'><MessageCircle size={14}/>Request Contact</a></div></article>) : <div className='empty'><Heart/><p>No approved profiles yet.</p><small>Submit your profile to join the Connections directory.</small></div>}</div> : submitted ? <div className='connection-success'><CheckCircle size={44}/><h3>Profile Submitted!</h3><p>Your profile is under review. Once approved by admin, it will appear in Browse Profiles.</p><button className='primary-btn' onClick={() => {setSubmitted(false); setTab('submit')}}>Submit Another</button></div> : <form onSubmit={submit} className='connection-form'><div className='connection-submit-head'><Heart size={21}/><div><h2>Submit Your Profile</h2><p>Profiles are reviewed before they appear publicly.</p></div></div><div className='form-two'><label>Name<input className='input' value={form.name} onChange={e=>set('name',e.target.value)}/>{errors.name&&<small className='form-error'>{errors.name}</small>}</label><label>Age Bracket<select className='input' value={form.ageBracket} onChange={e=>set('ageBracket',e.target.value)}><option value=''>Select age range</option>{ages.map(x=><option key={x}>{x}</option>)}</select>{errors.ageBracket&&<small className='form-error'>{errors.ageBracket}</small>}</label></div><div className='form-two'><label>Gender<select className='input' value={form.gender} onChange={e=>set('gender',e.target.value)}><option value=''>Select gender</option>{genders.map(x=><option key={x}>{x}</option>)}</select>{errors.gender&&<small className='form-error'>{errors.gender}</small>}</label><label>State<select className='input' value={form.state} onChange={e=>set('state',e.target.value)}><option value=''>Select state</option>{states.map(x=><option key={x}>{x}</option>)}</select>{errors.state&&<small className='form-error'>{errors.state}</small>}</label></div><div className='form-two'><label>Looking for<select className='input' value={form.lookingFor} onChange={e=>set('lookingFor',e.target.value)}><option value=''>Select preference</option>{looking.map(x=><option key={x}>{x}</option>)}</select>{errors.lookingFor&&<small className='form-error'>{errors.lookingFor}</small>}</label><label>Preferred Age Range<select className='input' value={form.lookingForAge} onChange={e=>set('lookingForAge',e.target.value)}><option value=''>Select range</option>{ages.map(x=><option key={x}>{x}</option>)}</select>{errors.lookingForAge&&<small className='form-error'>{errors.lookingForAge}</small>}</label></div><div className='form-two'><label>Preferred Location<select className='input' value={form.preferredLocation} onChange={e=>set('preferredLocation',e.target.value)}><option value=''>Select state</option>{states.map(x=><option key={x}>{x}</option>)}</select>{errors.preferredLocation&&<small className='form-error'>{errors.preferredLocation}</small>}</label><label>WhatsApp Number<input className='input' value={form.whatsappNumber} onChange={e=>set('whatsappNumber',e.target.value)} placeholder='e.g. 08012345678'/>{errors.whatsappNumber&&<small className='form-error'>{errors.whatsappNumber}</small>}</label></div><MediaUpload folder='profiles' value={form.photoUrl} onChange={v=>set('photoUrl',v)} label='Upload profile photo'/>{errors.photoUrl&&<small className='form-error'>{errors.photoUrl}</small>}<label>About You<textarea className='input connection-textarea' value={form.bioText} onChange={e=>set('bioText',e.target.value)} placeholder='Tell the community about yourself'/>{errors.bioText&&<small className='form-error'>{errors.bioText}</small>}</label><label className='consent'><input type='checkbox' checked={form.consent} onChange={e=>set('consent',e.target.checked)}/><span>I confirm that I am 18+ and consent to VCM publishing this profile for community connections.</span></label>{errors.consent&&<small className='form-error'>{errors.consent}</small>}{errors.submit&&<div className='notice'>{errors.submit}</div>}<button className='primary-btn full' disabled={busy}>{busy ? 'Submitting…' : 'Submit Profile'}</button></form>}
    </Page>;
}

function Page({title,eyebrow,children}:{title:string;eyebrow:string;children:ReactNode}){return <section className='page'><span className='eyebrow'>{eyebrow}</span><h1>{title}</h1>{children}</section>}
