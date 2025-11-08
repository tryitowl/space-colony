import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  getDoc
} from 'firebase/firestore';
import { firestore } from '../firebase/config';
import type { Event, GalaxyConfiguration, GameEvent } from '../types';

class EventService {
  async getActiveEvents(): Promise<Event[]> {
    try {
      // Query Firebase for events with status 'active' or 'scheduled'
      const eventsRef = collection(firestore, 'events');
      const q = query(eventsRef, where('status', 'in', ['active', 'scheduled']));
      const snapshot = await getDocs(q);
      
      const events: Event[] = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data() as GameEvent;
        events.push({
          id: doc.id,
          name: data.name,
          organization: data.organizationName,
          date: data.startTime ? new Date(data.startTime).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          description: data.eventDescription || '',
          participantCount: data.totalParticipants || 0,
          code: doc.id.substring(6, 10).toUpperCase(), // Extract 4 chars from event ID
          status: data.status as 'active' | 'inactive' || 'active',
          createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
          createdBy: data.createdBy || 'unknown',
        });
      });
      
      // Sort by creation date, newest first
      events.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      
      return events;
    } catch (error) {
      console.error('Error fetching active events:', error);
      return [];
    }
  }

  async saveGalaxyConfiguration(eventId: string, configuration: GalaxyConfiguration): Promise<void> {
    try {
      const configId = `galaxy_config_${Date.now()}`;
      const configWithMetadata = {
        ...configuration,
        id: configId,
        eventId,
        createdAt: Date.now(),
        status: 'active'
      };
      
      await setDoc(doc(firestore, 'galaxyConfigurations', configId), configWithMetadata);
      
      // TODO: Generate session IDs and access codes
      console.log('Galaxy configuration saved:', configId);
    } catch (error) {
      console.error('Error saving galaxy configuration:', error);
      throw error;
    }
  }

  async getEventById(eventId: string): Promise<Event | null> {
    try {
      const eventDoc = await getDoc(doc(firestore, 'events', eventId));
      
      if (!eventDoc.exists()) {
        return null;
      }
      
      const data = eventDoc.data() as GameEvent;
      return {
        id: eventDoc.id,
        name: data.name,
        organization: data.organizationName,
        date: data.startTime ? new Date(data.startTime).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        description: data.eventDescription || '',
        participantCount: data.totalParticipants || 0,
        code: eventDoc.id.substring(6, 10).toUpperCase(),
        status: data.status as 'active' | 'inactive' || 'active',
        createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
        createdBy: data.createdBy || 'unknown',
      };
    } catch (error) {
      console.error('Error fetching event by ID:', error);
      return null;
    }
  }

  async loadGalaxyConfiguration(eventId: string): Promise<GalaxyConfiguration | null> {
    try {
      const configsRef = collection(firestore, 'galaxyConfigurations');
      const q = query(configsRef, where('eventId', '==', eventId));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        return null;
      }
      
      // Return the most recent configuration
      const configs = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as GalaxyConfiguration[];
      
      configs.sort((a, b) => {
        const aTime = typeof a.createdAt === 'number' ? a.createdAt : (a.createdAt as any)?.toMillis?.() || 0;
        const bTime = typeof b.createdAt === 'number' ? b.createdAt : (b.createdAt as any)?.toMillis?.() || 0;
        return bTime - aTime;
      });
      
      return configs[0];
    } catch (error) {
      console.error('Error loading galaxy configuration:', error);
      return null;
    }
  }
}

export const eventService = new EventService();