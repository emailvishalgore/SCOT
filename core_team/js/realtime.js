// SCOT TOPAZ Core Team Portal - Realtime Subscriptions Manager
import { supabase } from './supabase-client.js';
import { showToast } from './utils.js';

export const appRealtime = {
  channels: {},

  init() {
    this.subscribeToContributions();
    this.subscribeToRegistrationRequests();
    this.subscribeToExpenses();
  },

  subscribeToContributions() {
    const channel = supabase.channel('realtime:contributions')
      .on(
        'postgres_changes',
        { event: '*', schema: 'finance', table: 'flat_contribution' },
        async (payload) => {
          console.log('Realtime contribution change:', payload);
          
          if (payload.eventType === 'UPDATE' && payload.new.status === 'PAID' && payload.old.status !== 'PAID') {
            // Fetch flat number details to show nicer message
            const { data: flatInfo } = await supabase
              .from('flat')
              .select('number, wing(name)')
              .eq('id', payload.new.flat_id)
              .single();
            
            const wingName = flatInfo?.wing?.name || '';
            const flatNum = flatInfo?.number || '';
            
            showToast(`💰 Payment of ₹${payload.new.amount || 3000} recorded for Flat ${wingName}-${flatNum}!`, 'success');
          }
          
          // Trigger re-render if current page has dynamic data refresher
          if (window.currentPageRefresher) {
            window.currentPageRefresher('flat_contribution', payload);
          }
        }
      )
      .subscribe();
      
    this.channels['contributions'] = channel;
  },

  subscribeToRegistrationRequests() {
    const channel = supabase.channel('realtime:registration_requests')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'core', table: 'registration_request' },
        async (payload) => {
          console.log('Realtime registration request:', payload);
          
          const wing = payload.new.wing_id ? 'Wing ' + payload.new.wing_id : '';
          showToast(`📋 New resident onboarding request received for Flat ${wing}-${payload.new.flat_id || ''}!`, 'warning');
          
          // Trigger re-render
          if (window.currentPageRefresher) {
            window.currentPageRefresher('registration_request', payload);
          }
        }
      )
      .subscribe();
      
    this.channels['registrations'] = channel;
  },

  subscribeToExpenses() {
    const channel = supabase.channel('realtime:expenses')
      .on(
        'postgres_changes',
        { event: '*', schema: 'finance', table: 'expense' },
        (payload) => {
          console.log('Realtime expense change:', payload);
          
          if (payload.eventType === 'INSERT') {
            showToast(`💸 New expense approval request submitted: ${payload.new.description}`, 'warning');
          } else if (payload.eventType === 'UPDATE' && payload.new.status !== payload.old.status) {
            showToast(`💸 Expense status updated to ${payload.new.status}: ${payload.new.description}`, 'success');
          }
          
          // Trigger re-render
          if (window.currentPageRefresher) {
            window.currentPageRefresher('expense', payload);
          }
        }
      )
      .subscribe();
      
    this.channels['expenses'] = channel;
  },

  destroy() {
    // Unsubscribe from all channels
    Object.values(this.channels).forEach(channel => {
      supabase.removeChannel(channel);
    });
    this.channels = {};
  }
};

window.appRealtime = appRealtime;
export default appRealtime;
