import BrandLogo from '../components/BrandLogo';
import { useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useApp } from '../AppContext';
import { useAction, useData } from '../hooks';
import { checkVerificationCompleteness, formatVerificationFileName, parseDocInfo, VERIFICATION_DOC_CATEGORIES } from '../domain';
import { colors as c, statusLabels } from '../theme';
import { Badge, Button, Card, Chip, Field, Label, Muted, Notice, Query, Screen, s } from '../components/ui';

export default function ProviderVerificationScreen({ navigation }) {
  const { identity, api, refresh } = useApp();
  const action = useAction();
  const [selectedCategory, setSelectedCategory] = useState('Government ID');
  const [docTitle, setDocTitle] = useState('');
  const [asset, setAsset] = useState(null);

  // Application form state for new providers
  const [displayName, setDisplayName] = useState(identity?.profile?.full_name || '');
  const [headline, setHeadline] = useState('');
  const [bio, setBio] = useState('');
  const [city, setCity] = useState('');
  const [serviceAreas, setServiceAreas] = useState('Bunawan');

  const q = useData(`provider-verification-${identity?.user?.id}`, () => api.providerVerification(identity?.user?.id), Boolean(identity?.user?.id));
  const data = q.data;
  const profile = data?.profile;
  const application = data?.applications?.[0];
  const files = data?.files || [];
  const completeness = checkVerificationCompleteness(files);

  if (!identity) {
    return (
      <Screen>
        <Card style={s.stack}>
          <Text style={s.sectionTitle}>Provider Verification & Credentials</Text>
          <Muted>Sign in to your SerbisyoGo account to manage your professional credentials or apply to become a verified service provider.</Muted>
          <Button title="Sign in" onPress={() => navigation.navigate('SignIn', { returnTo: 'ProviderVerification' })} />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={s.between}>
        <View style={s.stack}>
          <BrandLogo />
          <Label>Provider Workspace</Label>
          <Text style={s.title}>Credentials & Documents</Text>
        </View>
        {profile && <Badge>{statusLabels[profile.status] || profile.status}</Badge>}
      </View>

      <Query query={q}>
        {data && (
          <>
            {profile ? (
              <>
                {/* Application status / feedback notice */}
                {application?.reason ? (
                  <Notice>{`Administrative feedback: ${application.reason}`}</Notice>
                ) : application?.status === 'pending' ? (
                  <Notice>Your provider application is awaiting review. Upload at least one accepted ID or credential below. Extra documents are optional.</Notice>
                ) : null}

                {/* Requirements Checklist Card */}
                <Card style={s.stack}>
                  <View style={s.between}>
                    <Text style={s.sectionTitle}>Choose any one ID or credential</Text>
                    <Badge>{completeness.isComplete ? 'Document uploaded · Awaiting review' : 'One accepted document needed'}</Badge>
                  </View>
                  <Muted>Upload one accepted ID or credential. You do not need every document. An administrator reviews your submission before approval.</Muted>

                  <View style={styles.checklist}>{VERIFICATION_DOC_CATEGORIES.filter(category => category.id !== 'other_proof').map(category => <Text key={category.id} style={styles.checkTitle}>• {category.name}</Text>)}</View><Muted>Work photos and portfolio evidence are optional supporting documents.</Muted>
                </Card>

                <Card style={s.stack}><Text style={s.sectionTitle}>Separate document reviews</Text><Muted>These optional reviews are independent from application approval. Uploading a document does not automatically grant a public badge.</Muted><Badge>Identity: {data.credentialReviews?.some(row=>row.kind==='identity')?'Review recorded':'Not reviewed'}</Badge><Badge>Skills: {data.credentialReviews?.some(row=>row.kind==='skills')?'Review recorded':'Not reviewed'}</Badge></Card>
                {/* Upload Form Card */}
                <Card style={s.stack}>
                  <Text style={s.sectionTitle}>Upload Credential Document</Text>
                  <Muted>Select the credential category, attach a document or photo (PDF, JPG, PNG, WebP up to 10 MB), and submit.</Muted>

                  <Text style={s.fieldLabel}>Choose a document category:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                    {VERIFICATION_DOC_CATEGORIES.map(cat => (
                      <Chip
                        key={cat.id}
                        title={cat.badge}
                        selected={selectedCategory === cat.badge}
                        onPress={() => setSelectedCategory(cat.badge)}
                      />
                    ))}
                  </ScrollView>

                  <Field
                    label="Credential title or specification"
                    value={docTitle}
                    onChangeText={setDocTitle}
                    placeholder="e.g. PhilSys National ID, TESDA NC II Electrical, 2026 Clearance"
                    maxLength={80}
                  />

                  <Button
                    title={asset ? 'Change selected file' : 'Choose document or image'}
                    secondary
                    icon="attach-outline"
                    busy={action.busy}
                    onPress={() => action.run(async () => {
                      const picked = await DocumentPicker.getDocumentAsync({
                        type: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
                        copyToCacheDirectory: true
                      });
                      if (picked.canceled) return;
                      const selected = picked.assets[0];
                      if (!selected.size || selected.size > 10485760) throw new Error('Choose a document up to 10 MB.');
                      setAsset(selected);
                    })}
                  />
                  {asset && <Muted style={{ color: c.green }}>Selected: {asset.name} ({(Number(asset.size) / 1024).toFixed(0)} KB)</Muted>}

                  <Button
                    title="Upload credential document"
                    icon="cloud-upload-outline"
                    busy={action.busy}
                    disabled={!asset}
                    onPress={() => action.run(async () => {
                      if (!asset) throw new Error('Select a document or image to upload.');
                      const formattedName = formatVerificationFileName(selectedCategory, docTitle, asset.name);
                      const category = VERIFICATION_DOC_CATEGORIES.find(item => item.badge === selectedCategory)?.id;
                      if (!category) throw new Error('Choose a valid credential category.');
                      await api.uploadVerificationDoc(asset, formattedName, category);
                      setAsset(null);
                      setDocTitle('');
                      refresh();
                    })}
                  />
                </Card>

                {/* Uploaded Documents List Card */}
                <Card style={s.stack}>
                  <Text style={s.sectionTitle}>Uploaded Documents ({files.length})</Text>
                  {files.length === 0 ? (
                    <Muted>No documents uploaded yet. Choose any one accepted ID or credential above.</Muted>
                  ) : (
                    files.map(file => {
                      const info = parseDocInfo(file.original_name);
                      const category = VERIFICATION_DOC_CATEGORIES.find(item => item.id === file.verification_category);
                      return (
                        <View key={file.id} style={styles.fileRow}>
                          <View style={s.stack}>
                            <View style={s.row}>
                              <Badge>{category?.badge || 'Category required — upload again'}</Badge>
                              <Text style={styles.fileName}>{info.title}</Text>
                            </View>
                            <Muted>{(Number(file.byte_size) / 1024).toFixed(0)} KB · {file.mime_type === 'application/pdf' ? 'PDF Document' : 'Image'}</Muted>
                          </View>
                          <View style={[s.row, { gap: 8, marginTop: 8 }]}>
                            <Button
                              title="Preview"
                              secondary
                              style={{ minHeight: 36, paddingVertical: 8, paddingHorizontal: 12 }}
                              onPress={() => action.run(async () => {
                                const { url } = await api.getFileUrl(file.id, true);
                                await Linking.openURL(url);
                              })}
                            />
                            <Button
                              title="Remove"
                              secondary
                              danger
                              style={{ minHeight: 36, paddingVertical: 8, paddingHorizontal: 12 }}
                              onPress={() => action.run(async () => {
                                await api.deleteVerificationDoc(file.id);
                                refresh();
                              })}
                            />
                          </View>
                        </View>
                      );
                    })
                  )}
                </Card>
              </>
            ) : (
              /* Provider Application Form when !profile */
              <Card style={s.stack}>
                <Text style={s.sectionTitle}>Apply to become a Service Provider</Text>
                <Muted>Join our verified network of skilled professionals. Submit your application details below, then upload any one accepted ID or credential. Additional documents are optional.</Muted>

                <Field
                  label="Public display name"
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholder="Your full professional name"
                  maxLength={100}
                />
                <Field
                  label="Professional specialty headline"
                  value={headline}
                  onChangeText={setHeadline}
                  placeholder="e.g. Certified Electrician & Appliance Technician"
                  maxLength={160}
                />
                <Field
                  label="Experience & expertise (bio)"
                  value={bio}
                  onChangeText={setBio}
                  multiline
                  placeholder="Describe your trade background, years of experience, and skills (at least 20 characters)"
                  maxLength={2000}
                />
                <Field
                  label="Primary city or municipality"
                  value={city}
                  onChangeText={setCity}
                  placeholder="e.g. Bunawan"
                  maxLength={100}
                />
                <Field
                  label="Service coverage areas (comma-separated)"
                  value={serviceAreas}
                  onChangeText={setServiceAreas}
                  placeholder="e.g. Bunawan, San Francisco, Trento"
                />

                <Button
                  title="Submit provider application"
                  icon="checkmark-outline"
                  busy={action.busy}
                  onPress={() => action.run(async () => {
                    if (displayName.trim().length < 2) throw new Error('Enter a display name with at least 2 characters.');
                    if (headline.trim().length < 5) throw new Error('Enter a professional headline with at least 5 characters.');
                    if (bio.trim().length < 20) throw new Error('Enter your experience and bio (at least 20 characters).');
                    if (city.trim().length < 2) throw new Error('Enter your primary city.');
                    const areas = serviceAreas.split(',').map(s => s.trim()).filter(Boolean);
                    if (!areas.length) throw new Error('Enter at least one service area.');
                    await api.submitProviderApplication({
                      display_name: displayName.trim(),
                      headline: headline.trim(),
                      bio: bio.trim(),
                      city: city.trim(),
                      service_areas: areas
                    });
                    refresh();
                  })}
                />
              </Card>
            )}
          </>
        )}
      </Query>
      {action.error ? <Notice error>{action.error}</Notice> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  checklist: { gap: 14, backgroundColor: '#111f16', padding: 16, borderRadius: 14, borderWidth: 1, borderColor: c.border },
  checkItem: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  checkTitle: { color: c.text, fontSize: 13, fontWeight: '700' },
  fileRow: { padding: 14, borderRadius: 12, backgroundColor: '#111f16', borderWidth: 1, borderColor: c.border },
  fileName: { color: c.text, fontSize: 14, fontWeight: '600', flexShrink: 1 }
});
