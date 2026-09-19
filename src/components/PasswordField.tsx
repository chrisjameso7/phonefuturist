import { useState } from 'react';
export default function PasswordField({ autocomplete = 'current-password' }: { autocomplete?: string }) {
  const [visible, setVisible] = useState(false);
  return <div><label htmlFor="password">Password</label><input id="password" name="password" type={visible ? 'text' : 'password'} autoComplete={autocomplete} required minLength={12} maxLength={128}/><label className="inline"><input type="checkbox" checked={visible} onChange={e => setVisible(e.target.checked)}/>Show password</label></div>;
}
