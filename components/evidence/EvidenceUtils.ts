import { Budget, WithdrawalHistory } from '../../types';

export const getGroupedRealizations = (
  allBudgets: Budget[],
  dataSource: 'realization' | 'history',
  history: WithdrawalHistory[]
) => {
  if (dataSource === 'history') {
    const historyGroups: any[] = [];
    history.forEach((record: WithdrawalHistory) => {
      let snapshot: any = record.snapshot_data;
      if (typeof snapshot === 'string') {
        try { snapshot = JSON.parse(snapshot); } catch (e) { snapshot = {}; }
      }
      
      if (!snapshot) return;

      if (snapshot.groupedRecipients && Array.isArray(snapshot.groupedRecipients)) {
        snapshot.groupedRecipients.forEach((recipient: any, idx: number) => {
          const groupKey = `history-${record.id}-${idx}`;
          historyGroups.push({
            key: groupKey,
            vendor: recipient.name || 'Tanpa Nama',
            date: record.letter_date,
            month: new Date(record.letter_date).getMonth() + 1,
            totalAmount: recipient.amount,
            items: recipient.items ? recipient.items.map((it: any) => ({
              budgetDescription: it.budgetDescription,
              amount: it.amount,
              accountCode: it.accountCode
            })) : (recipient.descriptions?.map((desc: string) => ({
              budgetDescription: desc,
              amount: recipient.amount / (recipient.descriptions.length || 1)
            })) || []),
            evidence_files: recipient.evidence_files || [],
            isHistory: true,
            historyId: record.id
          });
        });
      } else if (Array.isArray(snapshot)) {
        snapshot.forEach((recipient: any, idx: number) => {
          const groupKey = `history-${record.id}-${idx}`;
          historyGroups.push({
            key: groupKey,
            vendor: recipient.name || 'Tanpa Nama',
            date: record.letter_date,
            month: new Date(record.letter_date).getMonth() + 1,
            totalAmount: recipient.amount,
            items: recipient.descriptions?.map((desc: string) => ({
              budgetDescription: desc,
              amount: recipient.amount / (recipient.descriptions.length || 1)
            })) || [],
            evidence_files: recipient.evidence_files || [],
            isHistory: true,
            historyId: record.id
          });
        });
      }
    });
    return historyGroups.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  const groups: any[] = [];
  allBudgets.forEach(budget => {
    budget.realizations?.forEach((real, idx) => {
      const vendorName = real.vendor || 'Tanpa Toko/Vendor';
      const groupKey = `${vendorName}-${real.date.split('T')[0]}-${real.month}`;
      
      let group = groups.find(g => g.key === groupKey);
      if (!group) {
        group = {
          key: groupKey,
          vendor: vendorName,
          date: real.date,
          month: real.month,
          notes: real.notes,
          totalAmount: 0,
          items: [],
          evidence_files: real.evidence_files || []
        };
        groups.push(group);
      }
      
      group.totalAmount += real.amount;
      group.items.push({ 
        budgetId: budget.id, 
        budgetDescription: budget.description, 
        realizationIndex: idx,
        amount: real.amount,
        accountCode: budget.account_code
      });
      
      if (real.evidence_files && real.evidence_files.length > group.evidence_files.length) {
        group.evidence_files = real.evidence_files;
      }
    });
  });
  return groups.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export const getAllEvidenceFiles = (allBudgets: Budget[], history: WithdrawalHistory[]) => {
  const list: any[] = [];
  allBudgets.forEach(budget => {
    budget.realizations?.forEach((real, realIdx) => {
      if (real.evidence_files && real.evidence_files.length > 0) {
        const vendorName = real.vendor || 'Tanpa Toko/Vendor';
        const transactionKey = `${vendorName}-${real.date.split('T')[0]}-${real.month}`;
        real.evidence_files.forEach(file => {
          list.push({ 
            ...file, 
            sourceType: 'Belanja', 
            vendor: vendorName, 
            date: real.date, 
            month: real.month,
            transactionKey,
            description: budget.description, 
            amount: real.amount,
            budgetId: budget.id,
            realizationIndex: realIdx
          });
        });
      }
    });
  });
  history.forEach(record => {
    let snapshot: any = record.snapshot_data;
    if (typeof snapshot === 'string') { try { snapshot = JSON.parse(snapshot); } catch(e) { snapshot = {}; } }
    if (!snapshot) return;
    if (snapshot.groupedRecipients && Array.isArray(snapshot.groupedRecipients)) {
      snapshot.groupedRecipients.forEach((recipient: any, idx: number) => {
        if (recipient.evidence_files && recipient.evidence_files.length > 0) {
          const vendorName = recipient.name || 'Tanpa Nama';
          const month = new Date(record.letter_date).getMonth() + 1;
          const transactionKey = `history-${record.id}-${idx}`;
          recipient.evidence_files.forEach((file: any) => list.push({ 
            ...file, 
            sourceType: 'Riwayat Pencairan', 
            vendor: vendorName, 
            date: record.letter_date, 
            month,
            transactionKey,
            description: recipient.descriptions?.join(', ') || 'Pencairan', 
            amount: recipient.amount,
            historyId: record.id,
            historyIdx: idx
          }));
        }
      });
    } else if (Array.isArray(snapshot)) {
      snapshot.forEach((recipient: any, idx: number) => {
        if (recipient.evidence_files && recipient.evidence_files.length > 0) {
          const vendorName = recipient.name || 'Tanpa Nama';
          const month = new Date(record.letter_date).getMonth() + 1;
          const transactionKey = `history-${record.id}-${idx}`;
          recipient.evidence_files.forEach((file: any) => list.push({ 
            ...file, 
            sourceType: 'Riwayat Pencairan', 
            vendor: vendorName, 
            date: record.letter_date, 
            month,
            transactionKey,
            description: recipient.descriptions?.join(', ') || 'Pencairan', 
            amount: recipient.amount,
            historyId: record.id,
            historyIdx: idx
          }));
        }
      });
    }
  });
  return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export const getGroupedAlbum = (allEvidenceFiles: any[]) => {
  const months: Record<number, any[]> = {};
  
  allEvidenceFiles.forEach(file => {
    if (!months[file.month]) {
      months[file.month] = [];
    }
    months[file.month].push(file);
  });

  const result: Record<number, Record<string, any>> = {};
  Object.keys(months).forEach(mStr => {
    const m = parseInt(mStr);
    const transactions: Record<string, any> = {};
    
    months[m].forEach(file => {
      if (!transactions[file.transactionKey]) {
        transactions[file.transactionKey] = {
          key: file.transactionKey,
          vendor: file.vendor,
          date: file.date,
          month: file.month,
          totalAmount: 0,
          files: []
        };
      }
      transactions[file.transactionKey].files.push(file);
    });

    Object.values(transactions).forEach((t: any) => {
      const uniqueItems = new Set();
      t.totalAmount = t.files.reduce((sum: number, f: any) => {
        const itemIdentity = `${f.vendor}-${f.date}-${f.amount}-${f.description}`;
        if (!uniqueItems.has(itemIdentity)) {
          uniqueItems.add(itemIdentity);
          return sum + f.amount;
        }
        return sum;
      }, 0);
    });

    result[m] = transactions;
  });

  return result;
};
