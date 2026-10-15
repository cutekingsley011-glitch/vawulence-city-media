import { MediaUpload } from './MediaUpload';

type Props = {
    type: 'post' | 'event' | 'contest' | 'job';
    form: any;
    setForm: (value: any) => void;
    close: () => void;
    create: () => void;
};

export default function CreatePanel({ type, form, setForm, close, create }: Props) {
    const update = (key: string, value: any) => setForm({ ...form, [key]: value });
    return (
        <section className='admin-create-panel'>
            <div className='admin-section-head'>
                <div>
                    <span className='eyebrow'>NEW CONTENT</span>
                    <h2>{type === 'post' ? 'Create Post' : type === 'event' ? 'Create Event' : type === 'contest' ? 'Create Contest' : 'Create Recruitment Job'}</h2>
                    <p>Fill in the new content below. Existing records remain underneath.</p>
                </div>
                <button type='button' className='outline-btn' onClick={close}>Close</button>
            </div>
            <div className='admin-create-grid'>
                <input className='input' value={form.title} onChange={e => update('title', e.target.value)} placeholder='Title' />
                {type === 'job' && <input className='input' value={form.companyName} onChange={e => update('companyName', e.target.value)} placeholder='Company name' />}
                {type === 'event' && <>
                    <input className='input' type='datetime-local' value={form.eventDate} onChange={e => update('eventDate', e.target.value)} />
                    <input className='input' value={form.eventTime} onChange={e => update('eventTime', e.target.value)} placeholder='Event time' />
                    <input className='input' value={form.venue} onChange={e => update('venue', e.target.value)} placeholder='Venue' />
                    <input className='input' value={form.host} onChange={e => update('host', e.target.value)} placeholder='Host' />
                    <label><input type='checkbox' checked={Boolean(form.isPaid)} onChange={e => update('isPaid', e.target.checked)} /> Paid Event</label>
                    {form.isPaid && <input className='input' type='number' value={form.ticketPrice} onChange={e => update('ticketPrice', e.target.value)} placeholder='Ticket price (₦)' />}
                </>}
                {type === 'contest' && <>
                    <input className='input' type='number' value={form.entryFee} onChange={e => update('entryFee', e.target.value)} placeholder='Entry fee (₦)' />
                    <input className='input' type='number' value={form.maxEntrants} onChange={e => update('maxEntrants', e.target.value)} placeholder='Maximum entrants' />
                    <input className='input' type='datetime-local' value={form.closesAt} onChange={e => update('closesAt', e.target.value)} />
                    {form.options.map((v: string, i: number) => <input className='input' key={i} value={v} onChange={e => update('options', form.options.map((x: string, j: number) => j === i ? e.target.value : x))} placeholder={`Contest option ${i + 1}`} />)}
                </>}
                {type === 'job' && <>
                    <textarea className='input' rows={4} value={form.requirements} onChange={e => update('requirements', e.target.value)} placeholder='Requirements — one per line' />
                    <select className='input' value={form.applyMethod} onChange={e => update('applyMethod', e.target.value)}><option value='whatsapp'>WhatsApp</option><option value='office_address'>Office Address</option></select>
                    <input className='input' value={form.applyContact} onChange={e => update('applyContact', e.target.value)} placeholder='Application WhatsApp / office address' />
                </>}
                <select className='input' value={form.category} onChange={e => update('category', e.target.value)}><option>News</option><option>Entertainment</option><option>Sports</option><option>Politics</option><option>Campus</option><option>Vawulence</option></select>
                {type === 'post' && <><textarea className='input' rows={2} value={form.excerpt} onChange={e => update('excerpt', e.target.value)} placeholder='Excerpt (optional)' /><label><input type='checkbox' checked={Boolean(form.isBreaking)} onChange={e => update('isBreaking', e.target.checked)} /> Mark as Breaking News</label></>}
                <textarea className='input' rows={8} value={form.content} onChange={e => update('content', e.target.value)} placeholder={type === 'post' ? 'Article content' : type === 'job' ? 'Job description' : type === 'contest' ? 'Contest description' : 'Event description'} />
                <MediaUpload folder={type === 'event' ? 'events' : type === 'contest' ? 'contests' : type === 'job' ? 'ads' : 'posts'} value={form.imageUrl} onChange={v => update('imageUrl', v)} label='Upload image' />
                {(type === 'post' || type === 'event') && <MediaUpload folder={type === 'event' ? 'events' : 'posts'} accept='video/*' value={form.videoUrl} onChange={v => update('videoUrl', v)} label='Upload video' />}
            </div>
            <div className='admin-edit-actions'><button type='button' className='outline-btn' onClick={close}>Cancel</button><button type='button' className='primary-btn' onClick={create}>Create</button></div>
        </section>
    );
}
